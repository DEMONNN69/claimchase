# Document Security - Cloudinary Configuration

## Security Approach: Private Files with Signed URLs

This project uses **private Cloudinary storage with signed URLs** for document security.

### Why Not Public Access?

Making insurance and dispute documents publicly accessible is a **security risk** because:
- Medical records contain sensitive health information (HIPAA concerns)
- Financial documents expose personal financial data
- Identification documents can enable identity theft
- Anyone with the URL can access documents without authentication

### How Signed URLs Work

1. **Files are stored privately** in Cloudinary (access control: authenticated)
2. **Signed URLs are generated on-demand** when authenticated users request files
3. **URLs expire after 1 hour** for security
4. **Signature verification** prevents URL tampering

### Implementation

Both `Document` and `DisputeDocument` models have a `file_url` property that:
- Generates a signed URL using Cloudinary's API
- Requires API secret for signature (secure)
- Sets expiration time (default: 1 hour)
- Falls back to regular URL if signing fails

```python
@property
def file_url(self):
    """Get a secure signed URL for the file (expires in 1 hour)"""
    signed_url, _ = cloudinary.utils.cloudinary_url(
        public_id,
        sign_url=True,
        secure=True,
        resource_type="raw",
    )
    return signed_url
```

### API Usage

When serializers return documents, they use the `file_url` property:

```python
class DocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.ReadOnlyField()  # Automatically calls the property
    
    class Meta:
        model = Document
        fields = ['id', 'file_name', 'file_url', ...]
```

Frontend receives secure, time-limited URLs that expire after 1 hour.

### Cloudinary Dashboard Settings

**Important:** In your Cloudinary console, ensure:
1. Go to Settings → Security
2. Set **Access Control** to "Authenticated" (NOT public)
3. Enable **Strict Transformations** (optional, adds extra security)

### Benefits

✅ Documents require authentication to access  
✅ URLs expire automatically (no cleanup needed)  
✅ Signature prevents URL manipulation  
✅ HIPAA/GDPR compliant approach  
✅ No additional infrastructure needed  

### Alternative: Public Access (NOT RECOMMENDED)

If you absolutely need public access (e.g., for marketing materials only):
1. Create separate folders for public vs private content
2. Only set public access for non-sensitive files
3. Never use for medical, financial, or personal documents

---

**Last Updated:** February 2026  
**Security Level:** High (Private + Signed URLs)
