"""
JWT Cookie Authentication — reads access token from httpOnly cookie.
Falls back to Authorization header for non-browser clients (admin, API tools).
"""
from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication


class JWTCookieAuthentication(JWTAuthentication):
    def authenticate(self, request):
        raw_token = request.COOKIES.get('access_token')
        if raw_token is None:
            return super().authenticate(request)
        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token


def set_jwt_cookies(response, refresh):
    """Attach access + refresh JWT as httpOnly cookies."""
    secure = not settings.DEBUG
    response.set_cookie(
        'access_token',
        str(refresh.access_token),
        max_age=15 * 60,
        httponly=True,
        secure=secure,
        samesite='Lax',
    )
    response.set_cookie(
        'refresh_token',
        str(refresh),
        max_age=7 * 24 * 60 * 60,
        httponly=True,
        secure=secure,
        samesite='Lax',
    )
    return response


def clear_jwt_cookies(response):
    response.delete_cookie('access_token')
    response.delete_cookie('refresh_token')
    return response
