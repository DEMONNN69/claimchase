"""
Temporary document access tokens for secure file viewing.
"""
import secrets
import time
from django.core.cache import cache


class DocumentAccessToken:
    """
    Generate and validate temporary single-use tokens for document access.
    Tokens expire after 5 minutes and can only be used once.
    """
    
    TOKEN_EXPIRY = 300  # 5 minutes
    CACHE_PREFIX = 'doc_access_'
    
    @classmethod
    def generate(cls, user_id: int, document_id: int, document_type: str = 'dispute') -> str:
        """
        Generate a temporary access token.
        
        Args:
            user_id: ID of the user requesting access
            document_id: ID of the document
            document_type: 'dispute' or 'case'
        
        Returns:
            Temporary access token string
        """
        token = secrets.token_urlsafe(32)
        
        # Store in cache with expiry
        cache_key = f"{cls.CACHE_PREFIX}{token}"
        cache_data = {
            'user_id': user_id,
            'document_id': document_id,
            'document_type': document_type,
            'created_at': time.time(),
            'used': False
        }
        
        cache.set(cache_key, cache_data, timeout=cls.TOKEN_EXPIRY)
        
        return token
    
    @classmethod
    def validate(cls, token: str) -> dict:
        """
        Validate and consume a temporary access token.
        
        Args:
            token: Token to validate
        
        Returns:
            dict with user_id, document_id, document_type if valid
            None if invalid or expired
        """
        cache_key = f"{cls.CACHE_PREFIX}{token}"
        cache_data = cache.get(cache_key)
        
        if not cache_data:
            return None
        
        # Check if already used (single-use token)
        if cache_data.get('used'):
            return None
        
        # Mark as used
        cache_data['used'] = True
        cache.set(cache_key, cache_data, timeout=cls.TOKEN_EXPIRY)
        
        return {
            'user_id': cache_data['user_id'],
            'document_id': cache_data['document_id'],
            'document_type': cache_data['document_type']
        }
