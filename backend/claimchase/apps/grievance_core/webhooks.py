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


def process_new_message(user: CustomUser, access_token: str, message_id: str, thread_to_case: dict):
    """
    Process a single new message and match it to a case if applicable.
    
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
        
        # Check if this thread belongs to one of our cases
        if thread_id not in thread_to_case:
            logger.debug(f"Message {message_id} not in a tracked thread")
            return
        
        case = thread_to_case[thread_id]
        from_email = msg_details['from_email']
        
        # Skip if this is an email FROM the user (their own sent email)
        if user.gmail_email and user.gmail_email.lower() in from_email.lower():
            logger.debug(f"Skipping own sent email {message_id}")
            return
        
        # Check if we already tracked this message
        if EmailTracking.objects.filter(gmail_message_id=message_id).exists():
            logger.debug(f"Message {message_id} already tracked")
            return
        
        # This is a reply to one of our cases!
        logger.info(f"Reply detected for case {case.case_number} from {from_email}")
        
        # Create EmailTracking record
        email_tracking = EmailTracking.objects.create(
            case=case,
            email_type='inbound',
            from_email=from_email,
            to_email=msg_details['to_email'] or user.gmail_email,
            subject=msg_details['subject'],
            body=msg_details['body'][:5000] if msg_details['body'] else '',  # Truncate to 5000 chars
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
            description=f'Reply received: {msg_details["subject"]}',
            old_value=old_status,
            new_value=case.status,
        )
        
        # Send notification to user
        send_reply_notification(user, case, msg_details)
        
    except Exception as e:
        logger.error(f"Error processing message {message_id}: {e}")


def send_reply_notification(user: CustomUser, case: Case, email_details: dict):
    """
    Send email notification to user about the reply received.
    
    Args:
        user: The user to notify
        case: The case that received a reply
        email_details: Details of the received email
    """
    try:
        subject = f"📬 Reply Received - Case {case.case_number}"
        
        # Create email body
        message_html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 20px; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 24px;">📬 New Reply Received!</h1>
            </div>
            
            <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
                <p style="color: #374151; font-size: 16px;">
                    Hi {user.first_name or user.username},
                </p>
                
                <p style="color: #374151; font-size: 16px;">
                    Great news! You've received a reply on your grievance case.
                </p>
                
                <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
                    <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">
                        <strong>Case Number:</strong> {case.case_number}
                    </p>
                    <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">
                        <strong>Insurance Company:</strong> {case.insurance_company_name}
                    </p>
                    <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">
                        <strong>From:</strong> {email_details.get('from_email', 'Unknown')}
                    </p>
                    <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">
                        <strong>Subject:</strong> {email_details.get('subject', 'No Subject')}
                    </p>
                </div>
                
                <p style="color: #374151; font-size: 16px;">
                    <strong>Preview:</strong><br>
                    <span style="color: #6b7280; font-style: italic;">
                        "{email_details.get('snippet', 'No preview available')[:200]}..."
                    </span>
                </p>
                
                <div style="text-align: center; margin-top: 25px;">
                    <a href="{settings.FRONTEND_URL}/cases/{case.id}" 
                       style="background: #2563eb; color: white; padding: 12px 30px; 
                              text-decoration: none; border-radius: 8px; font-weight: bold;
                              display: inline-block;">
                        View Full Reply
                    </a>
                </div>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
                
                <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                    This is an automated notification from ClaimChase.<br>
                    You're receiving this because you filed a grievance case.
                </p>
            </div>
        </body>
        </html>
        """
        
        message_plain = f"""
        New Reply Received - Case {case.case_number}
        
        Hi {user.first_name or user.username},
        
        Great news! You've received a reply on your grievance case.
        
        Case Number: {case.case_number}
        Insurance Company: {case.insurance_company_name}
        From: {email_details.get('from_email', 'Unknown')}
        Subject: {email_details.get('subject', 'No Subject')}
        
        Preview:
        "{email_details.get('snippet', 'No preview available')[:200]}..."
        
        View the full reply at: {settings.FRONTEND_URL}/cases/{case.id}
        
        --
        This is an automated notification from ClaimChase.
        """
        
        send_mail(
            subject=subject,
            message=message_plain,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=message_html,
            fail_silently=True,
        )
        
        logger.info(f"Reply notification sent to {user.email} for case {case.case_number}")
        
    except Exception as e:
        logger.error(f"Failed to send reply notification: {e}")


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
