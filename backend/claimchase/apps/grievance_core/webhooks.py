"""
Webhook handlers for Gmail Pub/Sub notifications.
Processes incoming email notifications and updates case tracking.
"""

import base64
import json
import logging
from datetime import datetime

from django.conf import settings
from django.core.mail import send_mail
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from claimchase.apps.users.models import CustomUser
from .models import Case, CaseTimeline, EmailTracking
from .gmail_service import GmailWatchService, GmailSendService, GmailEncryption

logger = logging.getLogger(__name__)


@csrf_exempt
@require_POST
def gmail_webhook(request):
    """
    Webhook endpoint for Gmail Pub/Sub push notifications.
    
    Google Pub/Sub sends a POST request with a message containing:
    - The user's email address
    - The new history ID
    
    We use this to fetch new emails and match them to cases.
    
    Endpoint: POST /webhooks/gmail/
    """
    try:
        # Parse the Pub/Sub message
        envelope = json.loads(request.body.decode('utf-8'))
        
        if 'message' not in envelope:
            logger.warning("Received Pub/Sub notification without message")
            return HttpResponse(status=200)  # Acknowledge to prevent retry
        
        pubsub_message = envelope['message']
        
        # Decode the base64 data
        if 'data' in pubsub_message:
            data = base64.urlsafe_b64decode(pubsub_message['data']).decode('utf-8')
            notification = json.loads(data)
        else:
            logger.warning("Pub/Sub message has no data")
            return HttpResponse(status=200)
        
        # Extract email and history ID from notification
        email_address = notification.get('emailAddress')
        new_history_id = notification.get('historyId')
        
        if not email_address:
            logger.warning("Notification missing emailAddress")
            return HttpResponse(status=200)
        
        logger.info(f"Gmail notification for {email_address}, history ID: {new_history_id}")
        
        # Find all users with this Gmail email (could be multiple)
        users = CustomUser.objects.filter(gmail_email=email_address, gmail_connected=True)
        
        if not users.exists():
            logger.warning(f"No user found with Gmail {email_address}")
            return HttpResponse(status=200)
        
        # Process the notification for each user with this Gmail
        for user in users:
            process_gmail_notification(user, new_history_id)
        
        # Return 200 to acknowledge receipt
        return HttpResponse(status=200)
        
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in webhook request: {e}")
        return HttpResponse(status=400)
    except Exception as e:
        logger.error(f"Error processing Gmail webhook: {e}")
        # Return 200 to prevent retries on permanent errors
        return HttpResponse(status=200)


def process_gmail_notification(user: CustomUser, new_history_id: str):
    """
    Process a Gmail notification by fetching new messages and matching to cases.
    
    Args:
        user: The CustomUser who received the email
        new_history_id: The new history ID from Gmail
    """
    try:
        # Get user's refresh token and create access token
        if not user.gmail_refresh_token:
            logger.error(f"User {user.email} has no Gmail refresh token")
            return
        
        refresh_token = GmailEncryption.decrypt(user.gmail_refresh_token)
        if not refresh_token:
            logger.error(f"Failed to decrypt Gmail token for user {user.email}")
            return
        
        access_token = GmailSendService.refresh_access_token(refresh_token)
        if not access_token:
            logger.error(f"Failed to refresh Gmail token for user {user.email}")
            return
        
        # Get the user's last known history ID
        last_history_id = user.gmail_history_id
        
        if not last_history_id:
            # First time - just save the current history ID
            user.gmail_history_id = new_history_id
            user.save(update_fields=['gmail_history_id'])
            logger.info(f"Initialized history ID for user {user.email}")
            return
        
        # Fetch history (new messages since last check)
        history_result = GmailWatchService.get_history(
            access_token=access_token,
            start_history_id=last_history_id,
            history_types=['messageAdded']
        )
        
        if not history_result['success']:
            if history_result['error'] == 'history_expired':
                # History ID too old, reset to current
                user.gmail_history_id = new_history_id
                user.save(update_fields=['gmail_history_id'])
                logger.warning(f"Reset history ID for user {user.email} (was expired)")
            return
        
        # Update user's history ID
        if history_result['history_id']:
            user.gmail_history_id = history_result['history_id']
            user.save(update_fields=['gmail_history_id'])
        
        new_messages = history_result['messages']
        if not new_messages:
            logger.debug(f"No new messages for user {user.email}")
            return
        
        logger.info(f"Found {len(new_messages)} new messages for user {user.email}")
        
        # Get user's active case thread IDs
        active_cases = Case.objects.filter(
            user=user,
            status__in=['submitted', 'under_review', 'sent']
        ).exclude(gmail_thread_id__isnull=True).exclude(gmail_thread_id='')
        
        thread_to_case = {case.gmail_thread_id: case for case in active_cases}
        
        if not thread_to_case:
            logger.debug(f"No active cases with thread IDs for user {user.email}")
            return
        
        # Process each new message
        for message_id in new_messages:
            process_new_message(user, access_token, message_id, thread_to_case)
            
    except Exception as e:
        logger.error(f"Error processing Gmail notification for {user.email}: {e}")


def smart_match_email_to_case(user: CustomUser, msg_details: dict):
    """
    Attempt to match an email to a case using smart matching heuristics.
    
    Matching strategies:
    1. Extract sender domain and match to insurance company
    2. Find policy number in subject/body
    3. Find case number in subject/body
    
    Args:
        user: The user who received the email
        msg_details: Dict with keys: from_email, subject, body, etc.
    
    Returns:
        tuple: (Case object, match_type) or (None, None) if no match
    """
    import re
    
    from_email = msg_details['from_email']
    subject = msg_details.get('subject', '')
    body = msg_details.get('body', '')
    
    # Combine subject and body for searching
    combined_text = f"{subject} {body}".lower()
    
    # Extract sender domain (e.g., "agent@insurance.com" -> "insurance.com")
    sender_domain = None
    if '@' in from_email:
        sender_domain = from_email.split('@')[-1].lower().strip()
    
    # Get all active/pending cases for this user
    from .models import Case
    user_cases = Case.objects.filter(
        user=user,
        status__in=['pending', 'in_progress', 'awaiting_response']
    ).select_related('insurance_company')
    
    matched_cases = []
    
    # Strategy 1: Match by case number (most specific)
    # Look for patterns like "Case #123", "Case: 123", "Ref: 123"
    case_number_patterns = [
        r'case[:\s#]*([A-Z0-9\-]+)',
        r'reference[:\s#]*([A-Z0-9\-]+)',
        r'ref[:\s#]*([A-Z0-9\-]+)',
    ]
    
    for pattern in case_number_patterns:
        matches = re.findall(pattern, combined_text, re.IGNORECASE)
        for potential_case_num in matches:
            potential_case_num = potential_case_num.strip().upper()
            case = user_cases.filter(case_number__iexact=potential_case_num).first()
            if case:
                return case, 'case_number'
    
    # Strategy 2: Match by policy number + sender domain
    # Look for patterns like "Policy #123", "Policy: 123", numbers with dashes/slashes
    policy_patterns = [
        r'policy[:\s#]*([A-Z0-9\-/]+)',
        r'policy number[:\s#]*([A-Z0-9\-/]+)',
        r'\b([A-Z0-9]{5,20})\b',  # Generic alphanumeric (5-20 chars)
    ]
    
    potential_policies = set()
    for pattern in policy_patterns:
        matches = re.findall(pattern, combined_text, re.IGNORECASE)
        potential_policies.update([m.strip().upper() for m in matches])
    
    if sender_domain and potential_policies:
        for policy_num in potential_policies:
            # Try to find cases with this policy number where the insurance company's
            # email domain matches the sender domain
            for case in user_cases:
                if case.policy_number and policy_num in case.policy_number.upper():
                    # Check if insurance company domain matches
                    if case.insurance_company and case.insurance_company.grievance_email:
                        company_email = case.insurance_company.grievance_email.lower()
                        if '@' in company_email:
                            company_domain = company_email.split('@')[-1].strip()
                            if sender_domain == company_domain or sender_domain.endswith(company_domain):
                                matched_cases.append((case, 'policy_domain'))
    
    # Strategy 3: Match by sender domain only (least specific, multiple matches possible)
    if sender_domain and not matched_cases:
        for case in user_cases:
            if case.insurance_company and case.insurance_company.grievance_email:
                company_email = case.insurance_company.grievance_email.lower()
                if '@' in company_email:
                    company_domain = company_email.split('@')[-1].strip()
                    if sender_domain == company_domain or sender_domain.endswith(company_domain):
                        matched_cases.append((case, 'domain_only'))
    
    # If we have exactly one match, use it
    if len(matched_cases) == 1:
        return matched_cases[0]
    
    # If multiple matches, prefer the most recent case
    if len(matched_cases) > 1:
        most_recent = max(matched_cases, key=lambda x: x[0].updated_at)
        logger.warning(f"Multiple cases matched for email from {from_email}, using most recent: {most_recent[0].case_number}")
        return most_recent
    
    # No match found
    return None, None


def process_new_message(user: CustomUser, access_token: str, message_id: str, thread_to_case: dict):
    """
    Process a single new message and match it to a case if applicable.
    
    Uses smart matching:
    1. First try thread_id match (direct reply)
    2. If no match, try smart matching by insurance domain + policy number
    
    Args:
        user: The user who received the email
        access_token: Valid Gmail access token
        message_id: Gmail message ID
        thread_to_case: Dict mapping thread IDs to Case objects
    """
    try:
        # Get message details
        msg_details = GmailWatchService.get_message_details(access_token, message_id)
        
        if not msg_details['success']:
            logger.warning(f"Failed to fetch message {message_id}: {msg_details['error']}")
            return
        
        thread_id = msg_details['thread_id']
        from_email = msg_details['from_email']
        
        # Skip if this is an email FROM the user (their own sent email)
        if user.gmail_email and user.gmail_email.lower() in from_email.lower():
            logger.debug(f"Skipping own sent email {message_id}")
            return
        
        # Check if we already tracked this message
        if EmailTracking.objects.filter(gmail_message_id=message_id).exists():
            logger.debug(f"Message {message_id} already tracked")
            return
        
        # Try to find matching case
        case = None
        match_type = None
        
        # Method 1: Direct thread match (reply to our email)
        if thread_id in thread_to_case:
            case = thread_to_case[thread_id]
            match_type = 'thread_id'
            logger.info(f"Thread match: Message {message_id} matched to case {case.case_number}")
        
        # Method 2: Smart matching (new email from insurance company)
        if not case:
            case, match_type = smart_match_email_to_case(user, msg_details)
            if case:
                logger.info(f"Smart match ({match_type}): Message {message_id} matched to case {case.case_number}")
        
        if not case:
            logger.debug(f"Message {message_id} could not be matched to any case")
            return
        
        # This is a reply or related email to one of our cases!
        logger.info(f"Email detected for case {case.case_number} from {from_email} (match: {match_type})")
        
        # Create EmailTracking record (without storing email body for privacy)
        email_tracking = EmailTracking.objects.create(
            case=case,
            email_type='inbound',
            from_email=from_email,
            to_email=msg_details['to_email'] or user.gmail_email,
            subject=msg_details['subject'][:200] if msg_details['subject'] else 'Reply received',  # Only subject line
            body='[Email content not stored for privacy compliance]',  # Don't store actual content
            status='delivered',
            sent_at=msg_details['date'] or timezone.now(),
            delivered_at=timezone.now(),
            gmail_message_id=message_id,
            gmail_thread_id=thread_id,
            is_automated=True,
        )
        
        # Update case status
        old_status = case.status
        if case.status in ['submitted', 'sent']:
            case.status = 'under_review'
            case.save(update_fields=['status', 'updated_at'])
        
        # Create timeline event
        CaseTimeline.objects.create(
            case=case,
            event_type='email_received',
            description=f'Reply received from {case.insurance_company_name}',
            old_value=old_status,
            new_value=case.status,
        )
        
        # Send notification to user
        send_reply_notification(user, case, msg_details)
        
    except Exception as e:
        logger.error(f"Error processing message {message_id}: {e}")


def send_reply_notification(user: CustomUser, case: Case, email_details: dict):
    """
    Create in-app notification about the reply received.
    
    Args:
        user: The user to notify
        case: The case that received a reply
        email_details: Details of the received email (not used for privacy)
    """
    try:
        from .models import Notification
        
        # Create in-app notification
        Notification.objects.create(
            user=user,
            case=case,
            type='email_reply',
            title=f'Reply Received - {case.case_number}',
            message=f'You have received a reply from {case.insurance_company_name} on your case.',
            action_url=f'/cases/{case.id}',
        )
        
        logger.info(f"In-app notification created for {user.email} for case {case.case_number}")
        
    except Exception as e:
        logger.error(f"Failed to create notification: {e}")


def renew_gmail_watches():
    """
    Renew Gmail watches that are about to expire.
    Should be called periodically (e.g., daily via cron/Celery).
    
    Gmail watch expires after 7 days, we renew when < 2 days remaining.
    """
    threshold = timezone.now() + timezone.timedelta(days=2)
    
    users_to_renew = CustomUser.objects.filter(
        gmail_connected=True,
        gmail_watch_expiration__lt=threshold
    ).exclude(gmail_refresh_token__isnull=True)
    
    renewed_count = 0
    failed_count = 0
    
    for user in users_to_renew:
        try:
            refresh_token = GmailEncryption.decrypt(user.gmail_refresh_token)
            if not refresh_token:
                continue
                
            access_token = GmailSendService.refresh_access_token(refresh_token)
            if not access_token:
                continue
            
            result = GmailWatchService.start_watch(access_token)
            
            if result['success']:
                user.gmail_watch_expiration = result['expiration']
                if result['history_id']:
                    user.gmail_history_id = result['history_id']
                user.save(update_fields=['gmail_watch_expiration', 'gmail_history_id'])
                renewed_count += 1
                logger.info(f"Renewed Gmail watch for {user.email}")
            else:
                failed_count += 1
                logger.error(f"Failed to renew Gmail watch for {user.email}: {result['error']}")
                
        except Exception as e:
            failed_count += 1
            logger.error(f"Error renewing watch for {user.email}: {e}")
    
    logger.info(f"Gmail watch renewal complete: {renewed_count} renewed, {failed_count} failed")
    return renewed_count, failed_count
