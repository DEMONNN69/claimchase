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
