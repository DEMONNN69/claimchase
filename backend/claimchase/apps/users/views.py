"""
Authentication views for user login and token generation.
Enables frontend to authenticate and receive JWT/Token for API access.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from django.utils import timezone
import logging

from .models import CustomUser
from .serializers import UserSerializer
from claimchase.apps.grievance_core.gmail_service import GmailOAuthService, GmailSendService, GmailEncryption

logger = logging.getLogger(__name__)


class AuthViewSet(viewsets.ViewSet):
    """
    ViewSet for user authentication.
    Handles login and token generation for API access.
    """
    
    permission_classes = [AllowAny]
    
    @action(detail=False, methods=['post'])
    def login(self, request):
        """
        Login endpoint.
        
        POST /api/auth/login/
        {
            "email": "user@gmail.com",
            "password": "password123"
        }
        
        Returns:
        {
            "token": "...",
            "user": {...},
            "message": "Login successful"
        }
        """
        email = request.data.get('email')
        password = request.data.get('password')
        
        if not email or not password:
            return Response({
                'success': False,
                'message': 'Email and password are required',
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Find user by email
        try:
            user = CustomUser.objects.get(email=email)
        except CustomUser.ShuklasNotExist:
            return Response({
                'success': False,
                'message': 'Invalid email or password',
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Verify password
        if not user.check_password(password):
            return Response({
                'success': False,
                'message': 'Invalid email or password',
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Check if user is active
        if not user.is_active:
            return Response({
                'success': False,
                'message': 'User account is disabled',
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get or create token
        token, created = Token.objects.get_or_create(user=user)
        
        logger.info(f"User {user.email} logged in successfully")
        
        return Response({
            'success': True,
            'message': 'Login successful',
            'token': token.key,
            'user': UserSerializer(user).data,
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def logout(self, request):
        """
        Logout endpoint.
        Deletes user's authentication token.
        
        POST /api/auth/logout/
        Headers: Authorization: Token <token>
        """
        try:
            token = Token.objects.get(user=request.user)
            token.delete()
            logger.info(f"User {request.user.email} logged out")
            return Response({
                'success': True,
                'message': 'Logout successful',
            }, status=status.HTTP_200_OK)
        except Token.ShuklasNotExist:
            return Response({
                'success': False,
                'message': 'Token not found',
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def signup(self, request):
        """
        Signup endpoint.
        Create a new user account.
        
        POST /api/auth/signup/
        {
            "email": "newuser@gmail.com",
            "password": "password123",
            "first_name": "Saurabh",
            "last_name": "Shukla",
            "phone": "+1234567890",
            "terms_accepted": true
        }
        """
        email = request.data.get('email')
        password = request.data.get('password')
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')
        phone = request.data.get('phone', '')
        terms_accepted = request.data.get('terms_accepted', False)

        # Validation
        if not all([email, password]):
            return Response({
                'success': False,
                'message': 'Email and password are required',
            }, status=status.HTTP_400_BAD_REQUEST)

        if not terms_accepted:
            return Response({
                'success': False,
                'message': 'You must accept the Terms & Conditions to create an account.',
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check if user already exists
        if CustomUser.objects.filter(email=email).exists():
            return Response({
                'success': False,
                'message': 'Email already registered',
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Create user
            user = CustomUser.objects.create_user(
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                phone=phone,
                is_verified=False,  # Email needs verification
                terms_accepted=True,
                terms_accepted_at=timezone.now(),
            )
            
            # Get or create token
            token, _ = Token.objects.get_or_create(user=user)
            
            logger.info(f"New user registered: {user.email}")
            
            return Response({
                'success': True,
                'message': 'Account created successfully',
                'token': token.key,
                'user': UserSerializer(user).data,
            }, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            return Response({
                'success': False,
                'message': f'Error creating account: {str(e)}',
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get', 'put'], permission_classes=[IsAuthenticated])
    def profile(self, request):
        """
        Get or update current user profile.
        
        GET /api/auth/profile/
        Headers: Authorization: Token <token>
        
        PUT /api/auth/profile/
        Headers: Authorization: Token <token>
        {
            "first_name": "Saurabh",
            "last_name": "Shukla",
            "phone": "+91 9876543210",
            "insurance_company": 1,
            "problem_type": "mediclaim"
        }
        """
        if request.method == 'GET':
            return Response({
                'success': True,
                'user': UserSerializer(request.user).data,
            }, status=status.HTTP_200_OK)
        
        elif request.method == 'PUT':
            # Update user profile
            user = request.user
            
            # Update allowed fields
            allowed_fields = ['first_name', 'last_name', 'phone', 'problem_type']
            
            for field in allowed_fields:
                if field in request.data:
                    setattr(user, field, request.data[field])
            
            # Handle insurance_company_id specially
            if 'insurance_company_id' in request.data:
                user.insurance_company_id = request.data['insurance_company_id']
            
            user.save()
            
            logger.info(f"User {user.email} updated profile")
            
            return Response({
                'success': True,
                'message': 'Profile updated successfully',
                'user': UserSerializer(user).data,
            }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def gmail_connect(self, request):
        """
        Get Gmail OAuth authorization URL.
        
        GET /api/auth/gmail/connect/
        Headers: Authorization: Token <token>
        
        Returns:
        {
            "authorization_url": "https://accounts.google.com/o/oauth2/auth?...",
            "message": "Visit this URL to authorize Gmail access"
        }
        """
        try:
            # Get user's auth token to include in state
            token = request.auth.key if hasattr(request.auth, 'key') else None
            
            auth_url = GmailOAuthService.get_authorization_url(user_token=token)
            
            return Response({
                'success': True,
                'authorization_url': auth_url,
                'message': 'Visit this URL to authorize Gmail access',
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error getting Gmail auth URL: {e}")
            return Response({
                'success': False,
                'message': 'Failed to get authorization URL',
                'error': str(e),
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get', 'post'], permission_classes=[AllowAny])
    def gmail_callback(self, request):
        """
        Handle Gmail OAuth callback.
        Exchange authorization code for tokens.
        
        GET /api/auth/gmail/callback/?code=...&state=<user_token>
        (Google redirects here after user authorizes)
        
        POST /api/auth/gmail/callback/
        Headers: Authorization: Token <token>
        {"code": "authorization_code_from_google"}
        
        Returns: Redirect to frontend with success/error status
        """
        from django.shortcuts import redirect
        from django.conf import settings
        
        # Get code and state from either GET params or POST body
        if request.method == 'GET':
            auth_code = request.GET.get('code')
            user_token = request.GET.get('state')  # Token passed in state
        else:
            auth_code = request.data.get('code')
            user_token = request.auth.key if hasattr(request.auth, 'key') else None
        
        if not auth_code:
            # Redirect to frontend with error
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
            return redirect(f"{frontend_url}/settings?gmail_error=no_code")
        
        if not user_token:
            # Redirect to frontend with error
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
            return redirect(f"{frontend_url}/settings?gmail_error=no_token")
        
        try:
            # Find user by token
            token_obj = Token.objects.get(key=user_token)
            user = token_obj.user
            
            # Exchange code for tokens
            tokens = GmailOAuthService.exchange_code_for_tokens(auth_code)
            
            if not tokens:
                frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
                return redirect(f"{frontend_url}/settings?gmail_error=exchange_failed")
            
            # Get user's Gmail email address
            gmail_email = GmailOAuthService.get_user_email(tokens['access_token'])
            
            if not gmail_email:
                frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
                return redirect(f"{frontend_url}/settings?gmail_error=no_email")
            
            # Save refresh token and Gmail email to user
            user.gmail_refresh_token = GmailEncryption.encrypt(tokens['refresh_token'])
            user.gmail_email = gmail_email
            user.gmail_connected = True
            user.gmail_token_expires_at = tokens['expires_at']
            user.save(update_fields=['gmail_refresh_token', 'gmail_email', 'gmail_connected', 'gmail_token_expires_at'])
            
            # Start Gmail watch for incoming email notifications
            try:
                from claimchase.apps.grievance_core.gmail_service import GmailWatchService
                watch_result = GmailWatchService.start_watch(tokens['access_token'])
                
                if watch_result['success']:
                    user.gmail_watch_expiration = watch_result['expiration']
                    user.gmail_history_id = watch_result['history_id']
                    user.save(update_fields=['gmail_watch_expiration', 'gmail_history_id'])
                    logger.info(f"Gmail watch started for {user.email}, expires: {watch_result['expiration']}")
                else:
                    logger.warning(f"Failed to start Gmail watch for {user.email}: {watch_result['error']}")
            except Exception as watch_error:
                # Don't fail the whole connection if watch setup fails
                logger.error(f"Error setting up Gmail watch for {user.email}: {watch_error}")
            
            logger.info(f"User {user.email} connected Gmail account: {gmail_email}")
            
            # Redirect to frontend with success
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
            return redirect(f"{frontend_url}/settings?gmail_connected=true&gmail_email={gmail_email}")
        
        except Token.DoesNotExist:
            logger.error(f"Invalid token in Gmail callback")
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
            return redirect(f"{frontend_url}/settings?gmail_error=invalid_token")
        
        except Exception as e:
            logger.error(f"Gmail callback error: {e}")
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
            return redirect(f"{frontend_url}/settings?gmail_error=unknown")
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def gmail_disconnect(self, request):
        """
        Disconnect Gmail account from ClaimChase.
        
        POST /api/auth/gmail/disconnect/
        Headers: Authorization: Token <token>
        
        Returns:
        {
            "success": true,
            "message": "Gmail account disconnected"
        }
        """
        try:
            user = request.user
            
            # Try to stop Gmail watch before disconnecting
            if user.gmail_refresh_token:
                try:
                    from claimchase.apps.grievance_core.gmail_service import GmailWatchService, GmailSendService
                    refresh_token = GmailEncryption.decrypt(user.gmail_refresh_token)
                    if refresh_token:
                        access_token = GmailSendService.refresh_access_token(refresh_token)
                        if access_token:
                            GmailWatchService.stop_watch(access_token)
                            logger.info(f"Stopped Gmail watch for {user.email}")
                except Exception as watch_error:
                    logger.warning(f"Could not stop Gmail watch for {user.email}: {watch_error}")
            
            # Clear all Gmail-related fields
            user.gmail_refresh_token = None
            user.gmail_email = None
            user.gmail_connected = False
            user.gmail_token_expires_at = None
            user.gmail_watch_expiration = None
            user.gmail_history_id = None
            user.save(update_fields=[
                'gmail_refresh_token', 'gmail_email', 'gmail_connected', 
                'gmail_token_expires_at', 'gmail_watch_expiration', 'gmail_history_id'
            ])
            
            logger.info(f"User {user.email} disconnected Gmail account")
            
            return Response({
                'success': True,
                'message': 'Gmail account disconnected',
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Gmail disconnect error: {e}")
            return Response({
                'success': False,
                'message': 'Failed to disconnect Gmail account',
            }, status=status.HTTP_400_BAD_REQUEST)

    # ------------------------------------------------------------------ #
    #  Google Login / "Continue with Google"                               #
    # ------------------------------------------------------------------ #

    @action(detail=False, methods=['get'])
    def google_connect(self, request):
        """
        Return the Google OAuth consent URL for login/signup.

        GET /api/auth/google/connect/
        """
        try:
            from claimchase.apps.grievance_core.gmail_service import GoogleAuthService
            auth_url = GoogleAuthService.get_authorization_url()
            return Response({
                'success': True,
                'authorization_url': auth_url,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error building Google auth URL: {e}")
            return Response({
                'success': False,
                'message': 'Failed to build Google authorization URL',
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def google_callback(self, request):
        """
        Exchange Google auth code for tokens, then log in or sign up the user.

        POST /api/auth/google/callback/
        {"code": "4/0A..."}

        - New user  → created with unusable password, gmail auto-connected
        - Existing user (same email) → logged in, gmail tokens merged/updated
        """
        from claimchase.apps.grievance_core.gmail_service import GoogleAuthService, GmailEncryption, GmailWatchService

        auth_code = request.data.get('code')
        if not auth_code:
            return Response({
                'success': False,
                'message': 'Authorization code is required',
            }, status=status.HTTP_400_BAD_REQUEST)

        # Exchange code for identity + Gmail tokens
        google_data = GoogleAuthService.exchange_code(auth_code)
        if not google_data:
            return Response({
                'success': False,
                'message': 'Failed to authenticate with Google',
            }, status=status.HTTP_400_BAD_REQUEST)

        email = google_data['email']
        google_id = google_data['google_id']

        if not email or not google_id:
            return Response({
                'success': False,
                'message': 'Could not retrieve account details from Google',
            }, status=status.HTTP_400_BAD_REQUEST)

        # --- Find or create user ---
        try:
            user = CustomUser.objects.get(email=email)
            # Merge: update google_id if not already set
            if not user.google_id:
                user.google_id = google_id
                user.save(update_fields=['google_id'])
        except CustomUser.DoesNotExist:
            # New user — create account
            user = CustomUser.objects.create(
                email=email,
                first_name=google_data.get('first_name', ''),
                last_name=google_data.get('last_name', ''),
                google_id=google_id,
                is_verified=True,
                terms_accepted=True,
                terms_accepted_at=timezone.now(),
            )
            user.set_unusable_password()
            user.save(update_fields=['password'])

        # --- Link Gmail tokens ---
        if google_data.get('refresh_token'):
            user.gmail_refresh_token = GmailEncryption.encrypt(google_data['refresh_token'])
            user.gmail_email = email
            user.gmail_connected = True
            user.gmail_token_expires_at = google_data['expires_at']
            user.save(update_fields=[
                'gmail_refresh_token', 'gmail_email',
                'gmail_connected', 'gmail_token_expires_at',
            ])

            # Attempt Gmail watch setup (non-fatal if it fails)
            try:
                watch_result = GmailWatchService.start_watch(google_data['access_token'])
                if watch_result['success']:
                    user.gmail_watch_expiration = watch_result['expiration']
                    user.gmail_history_id = watch_result['history_id']
                    user.save(update_fields=['gmail_watch_expiration', 'gmail_history_id'])
            except Exception as watch_err:
                logger.warning(f"Gmail watch setup failed for {user.email}: {watch_err}")

        # --- Issue DRF Token ---
        token, _ = Token.objects.get_or_create(user=user)

        logger.info(f"Google login successful for {user.email}")

        return Response({
            'success': True,
            'message': 'Login successful',
            'token': token.key,
            'user': UserSerializer(user).data,
        }, status=status.HTTP_200_OK)
        
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def google_disconnect(self, request):   
        """
        Disconnect Google account from ClaimChase (removes google_id and Gmail tokens).
        
        POST /api/auth/google/disconnect/
        Headers: Authorization: Token <token>
        
        Returns:
        {
            "success": true,
            "message": "Google account disconnected"
        }
        """
        try:
            user = request.user
            
            # Clear Google OAuth fields
            user.google_id = None
            user.gmail_refresh_token = None
            user.gmail_email = None
            user.gmail_connected = False
            user.gmail_token_expires_at = None
            user.gmail_watch_expiration = None
            user.gmail_history_id = None
            user.save(update_fields=[
                'google_id', 'gmail_refresh_token', 'gmail_email', 
                'gmail_connected', 'gmail_token_expires_at', 
                'gmail_watch_expiration', 'gmail_history_id'
            ])
            
            logger.info(f"User {user.email} disconnected Google account")
            
            return Response({
                'success': True,
                'message': 'Google account disconnected'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Google disconnect error: {e}")
            return Response({
                'success': False,
                'message': 'Failed to disconnect Google account',
            }, status=status.HTTP_400_BAD_REQUEST)

