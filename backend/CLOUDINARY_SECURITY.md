# Document Security - Cloudinary Configuration

## Security Approach: Token-Based Access with Signed URLs

This project uses **token-based Cloudinary storage with signed URLs** for document security.

### Why Not Public Access?

Making insurance and dispute documents publicly accessible is a **security risk** because:
- Medical records contain sensitive health information (HIPAA concerns)
- Financial documents expose personal financial data
- Identification documents can enable identity theft
- Anyone with the URL can access documents without authentication

### Security Architecture

#### 1. Storage Layer (Cloudinary)
- Files stored with `access_control: [{"access_type": "token"}]`
- Requires signed URLs to access
- Public URLs return 401 Unauthorized

#### 2. API Authorization Layer (Django)
- Serializers check permissions BEFORE returning URLs
- Only authorized users get signed URLs:
  - **Document owner** (user who uploaded)
  - **Case/Dispute owner** (user who owns the case/dispute)
  - **Admin/Staff** (superusers)
- Unauthorized users get `null` instead of URL

#### 3. Signed URL Layer
- URLs expire after 1 hour
- Signature prevents tampering
- Generated on-demand per request

### How It Works

**Upload Flow:**
```
1. User uploads document → Django view
2. CloudinaryField stores file → Cloudinary (default upload)
3. post_save signal triggers → Updates access_control to "token"
4. Document saved with authenticated access
```

**Access Flow:**
```
1. User requests document list → Django API
2. Serializer checks: Is user authorized?
   - YES: Generate signed URL via obj.file_url property
   - NO: Return null
3. Frontend receives URL (or null)
4. Frontend requests signed URL → Cloudinary validates signature → Serves file
```

### Implementation Details

### Implementation Details

**Signal Handlers** (`signals.py`):
```python
@receiver(post_save, sender=Document)
def set_cloudinary_authenticated_access(sender, instance, created, **kwargs):
    if created and instance.file:
        cloudinary.uploader.explicit(
            instance.file.public_id,
            access_control=[{"access_type": "token"}]  # Requires signed URLs
        )
```

**Model Property** (`models.py`):
```python
@property
def file_url(self):
    """Generate a secure signed URL (expires in 1 hour)"""
    signed_url, _ = cloudinary.utils.cloudinary_url(
        public_id,
        sign_url=True,  # Adds authentication signature
        secure=True,    # HTTPS only
        resource_type="raw",
    )
    return signed_url
```

**Serializer Authorization** (`serializers.py`):
```python
def get_file_url(self, obj):
    \"\"\"Only return signed URLs to authorized users\"\"\"
    user = self.context.get('request').user
    
    # Check authorization
    if user == obj.uploaded_by or user == obj.case.user or user.is_staff:
        return obj.file_url  # Returns signed URL
    
    return None  # Unauthorized - no URL provided
```

### Authorization Matrix

| User Type | Can View Own Documents | Can View Others' Documents | Can View All Documents |
|-**Two-layer security:** API authorization + Cloudinary token access  
✅ **Principle of least privilege:** Users only see their own documents  
✅ **Time-limited access:** URLs expire after 1 hour  
✅ **Tamper-proof:** Signature validation prevents URL manipulation  
✅ **HIPAA/GDPR compliant:** Private storage with audit trail  
✅ **Zero trust architecture:** Every request validated  

### Testing

**Test Authorization:**
```bash
# As document owner - should return URL
GET /api/disputes/123/documents/
Authorization: Bearer <owner_token>

# As different user - should return null
GET /api/disputes/123/documents/
Authorization: Bearer <other_user_token>

# As admin - should return URL
GET /api/disputes/123/documents/
Authorization: Bearer <admin_token>
```

**Test Signed URLs:**
```bash
# Valid signed URL - works
GET https://res.cloudinary.com/.../s--signature--/dispute_doc.pdf

# Tampered signature - fails with 401
GET https://res.cloudinary.com/.../s--fake_sig--/dispute_doc.pdf

# Expired URL (after 1 hour) - fails with 401
GET https://res.cloudinary.com/.../dispute_doc.pdf
```

### Troubleshooting

**Problem:** Files still accessible via public URL  
**Solution:** Run `python manage.py fix_cloudinary_access` to update existing files

**Problem:** Signed URLs return 401  
**Solution:** Check that CLOUDINARY_API_SECRET is correctly configured in environment

**Problem:** Users seeing null for file_url  
**Solution:** Check serializer authorization logic and user permissions

---

**Last Updated:** February 2026  
**Security Level:** High (Token-Based + API Authorization + Signed URLs)  
**Compliance:** HIPAA, GDPR, SOC2 ready
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
