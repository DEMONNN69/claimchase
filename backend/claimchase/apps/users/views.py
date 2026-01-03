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
import logging

from .models import CustomUser
from .serializers import UserSerializer

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
            "username": "newuser",
            "password": "password123",
            "first_name": "Saurabh",
            "last_name": "Shukla",
            "phone": "+1234567890"
        }
        """
        email = request.data.get('email')
        username = request.data.get('username')
        password = request.data.get('password')
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')
        phone = request.data.get('phone', '')
        
        # Validation
        if not all([email, username, password]):
            return Response({
                'success': False,
                'message': 'Email, username, and password are required',
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user already exists
        if CustomUser.objects.filter(email=email).exists():
            return Response({
                'success': False,
                'message': 'Email already registered',
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if CustomUser.objects.filter(username=username).exists():
            return Response({
                'success': False,
                'message': 'Username already taken',
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Create user
            user = CustomUser.objects.create_user(
                email=email,
                username=username,
                password=password,
                first_name=first_name,
                last_name=last_name,
                phone=phone,
                is_verified=False,  # Email needs verification
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
