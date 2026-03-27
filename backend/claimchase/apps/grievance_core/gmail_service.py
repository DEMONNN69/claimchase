"""
Gmail Service Layer
Handles Gmail OAuth authentication and email operations.
"""

import base64
import logging
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google.auth.exceptions import RefreshError
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from django.conf import settings
from django.utils import timezone
from cryptography.fernet import Fernet

logger = logging.getLogger(__name__)


class GmailEncryption:
    """Handle encryption/decryption of sensitive tokens."""
    
    @staticmethod
    def _get_fernet_key():
        """Generate a valid Fernet key from Django SECRET_KEY."""
        import hashlib
        # Use SHA256 hash of SECRET_KEY to get consistent 32 bytes
        key_bytes = hashlib.sha256(settings.ENCRYPTION_KEY.encode()).digest()
        # Fernet requires base64-encoded key
        return base64.urlsafe_b64encode(key_bytes)
    
    @staticmethod
    def encrypt(token: str) -> str:
        """Encrypt a token."""
        cipher = Fernet(GmailEncryption._get_fernet_key())
        return cipher.encrypt(token.encode()).decode()
    
    @staticmethod
    def decrypt(encrypted_token: str) -> str:
        """Decrypt a token."""
        try:
            cipher = Fernet(GmailEncryption._get_fernet_key())
            return cipher.decrypt(encrypted_token.encode()).decode()
        except Exception as e:
            logger.error(f"Token decryption error: {e}")
            return None


class GmailOAuthService:
    """Handle Gmail OAuth 2.0 authentication."""
    
    @staticmethod
    def get_authorization_url(user_token: str = None) -> str:
        """
        Get the OAuth authorization URL.
        User should visit this URL to authorize the app.
        Pass user_token to include it in state for backend identification.
        """
        flow = Flow.from_client_config(
            {
                'installed': {
                    'client_id': settings.GOOGLE_OAUTH_CLIENT_ID,
                    'client_secret': settings.GOOGLE_OAUTH_CLIENT_SECRET,
                    'auth_uri': 'https://accounts.google.com/o/oauth2/auth',
                    'token_uri': 'https://oauth2.googleapis.com/token',
                    'redirect_uris': [settings.GOOGLE_OAUTH_REDIRECT_URI],
                }
            },
            scopes=settings.GMAIL_SCOPES
        )
        
        flow.redirect_uri = settings.GOOGLE_OAUTH_REDIRECT_URI
        
        # Include user token in state if provided (for backend redirect flow)
        if user_token:
            auth_url, state = flow.authorization_url(
                access_type='offline',
                prompt='consent',
                state=user_token
            )
        else:
            auth_url, state = flow.authorization_url(
                access_type='offline',
                prompt='consent'
            )
        
        return auth_url
    
    @staticmethod
    def exchange_code_for_tokens(auth_code: str) -> dict:
        """
        Exchange authorization code for access and refresh tokens.
        """
        try:
            flow = Flow.from_client_config(
                {
                    'installed': {
                        'client_id': settings.GOOGLE_OAUTH_CLIENT_ID,
                        'client_secret': settings.GOOGLE_OAUTH_CLIENT_SECRET,
                        'auth_uri': 'https://accounts.google.com/o/oauth2/auth',
                        'token_uri': 'https://oauth2.googleapis.com/token',
                        'redirect_uris': [settings.GOOGLE_OAUTH_REDIRECT_URI],
                    }
                },
                scopes=settings.GMAIL_SCOPES
            )
            
            flow.redirect_uri = settings.GOOGLE_OAUTH_REDIRECT_URI
            creds = flow.fetch_token(code=auth_code)
            
            return {
                'access_token': creds.get('access_token'),
                'refresh_token': creds.get('refresh_token'),
                'expires_at': timezone.now() + timedelta(seconds=creds.get('expires_in', 3600)),
            }
        except Exception as e:
            logger.error(f"Token exchange error: {e}")
            return None
    
    @staticmethod
    def get_user_email(access_token: str) -> str:
        """Get the Gmail user's email address."""
        try:
            creds = Credentials(token=access_token)
            service = build('gmail', 'v1', credentials=creds)
            profile = service.users().getProfile(userId='me').execute()
            return profile.get('emailAddress')
        except Exception as e:
            logger.error(f"Error fetching user email: {e}")
            return None


class GmailSendService:
    """Handle sending emails via Gmail API."""
    
    @staticmethod
    def refresh_access_token(refresh_token: str) -> str:
        """Get a new access token using refresh token."""
        try:
            creds = Credentials(
                token=None,
                refresh_token=refresh_token,
                token_uri='https://oauth2.googleapis.com/token',
                client_id=settings.GOOGLE_OAUTH_CLIENT_ID,
                client_secret=settings.GOOGLE_OAUTH_CLIENT_SECRET,
            )
            
            request = Request()
            creds.refresh(request)
            
            return creds.token
        except RefreshError as e:
            logger.error(f"Token refresh failed: {e}")
            return None
    
    @staticmethod
    def send_email(
        access_token: str,
        from_email: str,
        to_email: str,
        subject: str,
        body: str,
        cc_emails: list = None,
        attachments: list = None
    ) -> dict:
        """
        Send an email via Gmail API.
        
        Returns:
            {
                'success': bool,
                'message_id': str or None,
                'thread_id': str or None,
                'error': str or None,
            }
        """
        try:
            creds = Credentials(token=access_token)
            service = build('gmail', 'v1', credentials=creds)
            
            # Create message
            message = MIMEMultipart('alternative')
            message['To'] = to_email
            message['From'] = from_email
            message['Subject'] = subject
            
            if cc_emails:
                message['Cc'] = ', '.join(cc_emails)
            
            # Attach body
            message.attach(MIMEText(body, 'html'))
            
            # TODO: Add attachment support here
            
            # Encode message
            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
            
            # Send message
            result = service.users().messages().send(
                userId='me',
                body={'raw': raw_message}
            ).execute()
            
            logger.info(f"Email sent successfully. Message ID: {result.get('id')}")
            
            return {
                'success': True,
                'message_id': result.get('id'),
                'thread_id': result.get('threadId'),
                'error': None,
            }
            
        except HttpError as e:
            error_msg = f"Gmail API error: {e}"
            logger.error(error_msg)
            return {
                'success': False,
                'message_id': None,
                'thread_id': None,
                'error': error_msg,
            }
        except Exception as e:
            error_msg = f"Unexpected error sending email: {e}"
            logger.error(error_msg)
            return {
                'success': False,
                'message_id': None,
                'thread_id': None,
                'error': error_msg,
            }
    
    @staticmethod
    def get_emails_from_thread(access_token: str, thread_id: str) -> list:
        """Get all emails in a thread."""
        try:
            creds = Credentials(token=access_token)
            service = build('gmail', 'v1', credentials=creds)
            
            result = service.users().threads().get(
                userId='me',
                id=thread_id
            ).execute()
            
            messages = []
            for msg in result.get('messages', []):
                messages.append(msg.get('id'))
            
            return messages
        except Exception as e:
            logger.error(f"Error fetching thread: {e}")
            return []
    
    @staticmethod
    def search_emails(access_token: str, query: str) -> list:
        """
        Search for emails in Gmail.
        
        Example queries:
        - "from:insurance@company.com"
        - "to:user@gmail.com"
        - "subject:grievance"
        - "after:2025-01-04"
        """
        try:
            creds = Credentials(token=access_token)
            service = build('gmail', 'v1', credentials=creds)
            
            result = service.users().messages().list(
                userId='me',
                q=query,
                maxResults=10
            ).execute()
            
            messages = []
            for msg in result.get('messages', []):
                messages.append(msg.get('id'))
            
            return messages
        except Exception as e:
            logger.error(f"Error searching emails: {e}")
            return []


class GmailWatchService:
    """
    Handle Gmail Pub/Sub Watch for real-time incoming email notifications.
    
    This service manages:
    1. Setting up watch on user's Gmail inbox
    2. Processing Pub/Sub push notifications
    3. Fetching new emails via history API
    """
    
    @staticmethod
    def start_watch(access_token: str) -> dict:
        """
        Start watching a user's Gmail inbox for new emails.
        
        This calls Gmail's watch() API which sets up a Pub/Sub subscription
        that notifies us when new emails arrive.
        
        Watch expires after 7 days and must be renewed.
        
        Returns:
            {
                'success': bool,
                'history_id': str or None,
                'expiration': datetime or None,
                'error': str or None,
            }
        """
        try:
            creds = Credentials(token=access_token)
            service = build('gmail', 'v1', credentials=creds)
            
            # Start watching inbox
            request_body = {
                'topicName': settings.GMAIL_PUBSUB_TOPIC,
                'labelIds': ['INBOX'],
                'labelFilterBehavior': 'include'
            }
            
            result = service.users().watch(
                userId='me',
                body=request_body
            ).execute()
            
            # Convert expiration from milliseconds to datetime
            expiration_ms = int(result.get('expiration', 0))
            expiration_dt = datetime.fromtimestamp(expiration_ms / 1000)
            
            logger.info(f"Gmail watch started. History ID: {result.get('historyId')}, Expires: {expiration_dt}")
            
            return {
                'success': True,
                'history_id': result.get('historyId'),
                'expiration': expiration_dt,
                'error': None,
            }
            
        except HttpError as e:
            error_msg = f"Gmail API error starting watch: {e}"
            logger.error(error_msg)
            return {
                'success': False,
                'history_id': None,
                'expiration': None,
                'error': error_msg,
            }
        except Exception as e:
            error_msg = f"Unexpected error starting watch: {e}"
            logger.error(error_msg)
            return {
                'success': False,
                'history_id': None,
                'expiration': None,
                'error': error_msg,
            }
    
    @staticmethod
    def stop_watch(access_token: str) -> bool:
        """Stop watching a user's Gmail inbox."""
        try:
            creds = Credentials(token=access_token)
            service = build('gmail', 'v1', credentials=creds)
            
            service.users().stop(userId='me').execute()
            logger.info("Gmail watch stopped successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error stopping Gmail watch: {e}")
            return False
    
    @staticmethod
    def get_history(access_token: str, start_history_id: str, history_types: list = None) -> dict:
        """
        Get Gmail history (changes) since a given history ID.
        
        Args:
            access_token: Valid Gmail access token
            start_history_id: History ID to start from
            history_types: List of types to include ('messageAdded', 'messageDeleted', etc.)
        
        Returns:
            {
                'success': bool,
                'messages': list of message IDs,
                'history_id': str (latest history ID),
                'error': str or None,
            }
        """
        try:
            creds = Credentials(token=access_token)
            service = build('gmail', 'v1', credentials=creds)
            
            params = {
                'userId': 'me',
                'startHistoryId': start_history_id,
                'labelId': 'INBOX',
            }
            
            if history_types:
                params['historyTypes'] = history_types
            
            result = service.users().history().list(**params).execute()
            
            new_messages = []
            history_records = result.get('history', [])
            
            for record in history_records:
                # Get messages that were added to inbox
                messages_added = record.get('messagesAdded', [])
                for msg_data in messages_added:
                    message = msg_data.get('message', {})
                    msg_id = message.get('id')
                    if msg_id:
                        new_messages.append(msg_id)
            
            return {
                'success': True,
                'messages': new_messages,
                'history_id': result.get('historyId'),
                'error': None,
            }
            
        except HttpError as e:
            # 404 means history ID is too old, need full sync
            if e.resp.status == 404:
                logger.warning(f"History ID {start_history_id} is too old, need full sync")
                return {
                    'success': False,
                    'messages': [],
                    'history_id': None,
                    'error': 'history_expired',
                }
            error_msg = f"Gmail API error fetching history: {e}"
            logger.error(error_msg)
            return {
                'success': False,
                'messages': [],
                'history_id': None,
                'error': error_msg,
            }
        except Exception as e:
            error_msg = f"Unexpected error fetching history: {e}"
            logger.error(error_msg)
            return {
                'success': False,
                'messages': [],
                'history_id': None,
                'error': error_msg,
            }
    
    @staticmethod
    def get_message_details(access_token: str, message_id: str) -> dict:
        """
        Get full details of a specific email message.
        
        Returns:
            {
                'success': bool,
                'message_id': str,
                'thread_id': str,
                'from_email': str,
                'to_email': str,
                'subject': str,
                'snippet': str,
                'body': str,
                'date': datetime,
                'error': str or None,
            }
        """
        try:
            creds = Credentials(token=access_token)
            service = build('gmail', 'v1', credentials=creds)
            
            # Use metadata format for privacy compliance - only fetches headers, not body
            result = service.users().messages().get(
                userId='me',
                id=message_id,
                format='metadata',  # Only metadata, no body content
                metadataHeaders=['From', 'To', 'Subject', 'Date']  # Specific headers only
            ).execute()
            
            # Parse headers
            headers = result.get('payload', {}).get('headers', [])
            header_dict = {h['name'].lower(): h['value'] for h in headers}
            
            # Note: Body content is NOT fetched for privacy compliance (metadata format only)
            # Only metadata (from, to, subject, date) is retrieved
            
            # Parse date
            date_str = header_dict.get('date', '')
            from email.utils import parsedate_to_datetime
            try:
                email_date = parsedate_to_datetime(date_str)
            except:
                email_date = timezone.now()
            
            return {
                'success': True,
                'message_id': result.get('id'),
                'thread_id': result.get('threadId'),
                'from_email': header_dict.get('from', ''),
                'to_email': header_dict.get('to', ''),
                'subject': header_dict.get('subject', '(No Subject)'),
                'snippet': result.get('snippet', ''),  # Gmail-generated snippet (safe)
                'body': '',  # Not fetched for privacy compliance
                'date': email_date,
                'error': None,
            }
            
        except Exception as e:
            error_msg = f"Error fetching message details: {e}"
            logger.error(error_msg)


class GoogleAuthService:
    """
    Handle Google OAuth 2.0 for user login/signup (SSO).
    Requests identity + gmail.send scopes in one consent flow.
    """

    @staticmethod
    def get_authorization_url() -> str:
        """Return the Google consent URL for login/signup."""
        flow = Flow.from_client_config(
            {
                'web': {
                    'client_id': settings.GOOGLE_OAUTH_CLIENT_ID,
                    'client_secret': settings.GOOGLE_OAUTH_CLIENT_SECRET,
                    'auth_uri': 'https://accounts.google.com/o/oauth2/auth',
                    'token_uri': 'https://oauth2.googleapis.com/token',
                    'redirect_uris': [settings.GOOGLE_LOGIN_REDIRECT_URI],
                }
            },
            scopes=settings.GOOGLE_LOGIN_SCOPES,
        )
        flow.redirect_uri = settings.GOOGLE_LOGIN_REDIRECT_URI
        auth_url, _ = flow.authorization_url(
            access_type='offline',
            prompt='consent',
            include_granted_scopes='false',
        )
        return auth_url

    @staticmethod
    def exchange_code(auth_code: str) -> dict | None:
        """
        Exchange authorization code for tokens + fetch Google user info.

        Returns dict with keys:
            google_id, email, first_name, last_name,
            access_token, refresh_token, expires_at
        or None on failure.
        """
        import requests as http_requests

        try:
            flow = Flow.from_client_config(
                {
                    'web': {
                        'client_id': settings.GOOGLE_OAUTH_CLIENT_ID,
                        'client_secret': settings.GOOGLE_OAUTH_CLIENT_SECRET,
                        'auth_uri': 'https://accounts.google.com/o/oauth2/auth',
                        'token_uri': 'https://oauth2.googleapis.com/token',
                        'redirect_uris': [settings.GOOGLE_LOGIN_REDIRECT_URI],
                    }
                },
                scopes=settings.GOOGLE_LOGIN_SCOPES,
            )
            flow.redirect_uri = settings.GOOGLE_LOGIN_REDIRECT_URI
            token_data = flow.fetch_token(code=auth_code)

            access_token = token_data.get('access_token')
            refresh_token = token_data.get('refresh_token')
            expires_in = token_data.get('expires_in', 3600)

            if not access_token:
                logger.error("Google token exchange returned no access_token")
                return None

            # Fetch user identity from Google userinfo endpoint
            userinfo_resp = http_requests.get(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                headers={'Authorization': f'Bearer {access_token}'},
                timeout=10,
            )
            if userinfo_resp.status_code != 200:
                logger.error(f"Google userinfo fetch failed: {userinfo_resp.status_code}")
                return None

            userinfo = userinfo_resp.json()

            return {
                'google_id': userinfo.get('sub'),
                'email': userinfo.get('email'),
                'first_name': userinfo.get('given_name', ''),
                'last_name': userinfo.get('family_name', ''),
                'access_token': access_token,
                'refresh_token': refresh_token,
                'expires_at': timezone.now() + timedelta(seconds=expires_in),
            }

        except Exception as e:
            logger.error(f"Google code exchange error: {e}")
            return None
            return {
                'success': False,
                'message_id': message_id,
                'thread_id': None,
                'from_email': None,
                'to_email': None,
                'subject': None,
                'snippet': None,
                'body': None,
                'date': None,
                'error': error_msg,
            }
