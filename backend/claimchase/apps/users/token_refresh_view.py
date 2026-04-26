"""
Cookie-based JWT token refresh view.
Reads refresh token from httpOnly cookie, sets new access (and rotated refresh) cookie.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

from .cookie_auth import set_jwt_cookies, clear_jwt_cookies


class CookieTokenRefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get('refresh_token')

        if not refresh_token:
            return Response({'detail': 'Refresh token not found.'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            refresh = RefreshToken(refresh_token)
            response = Response({'success': True}, status=status.HTTP_200_OK)
            return set_jwt_cookies(response, refresh)
        except (TokenError, InvalidToken):
            response = Response({'detail': 'Invalid or expired refresh token.'}, status=status.HTTP_401_UNAUTHORIZED)
            return clear_jwt_cookies(response)
