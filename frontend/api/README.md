# Vercel Serverless Functions

This directory contains Vercel serverless functions that run on Vercel's edge network.

## `proxy-documents.js`

**Purpose:** Securely proxy document downloads from the backend API, hiding the backend URL from browsers.

**How it works:**
1. Browser requests document via: `/api/proxy-documents?type=case&disputeId=1&docId=5&access=token`
2. Serverless function validates parameters
3. Function fetches document from backend (server-to-server request)
4. Function streams document back to browser
5. **Backend URL never exposed to the browser** ✅

**URL Format:**
```
GET /api/proxy-documents?type={case|dispute}&disputeId={id}&docId={id}&access={token}
```

**Parameters:**
- `type`: Document type (`case` or `dispute`)
- `disputeId`: ID of the case/dispute
- `docId`: ID of the document
- `access`: Temporary access token (expires after 5 minutes)

**Response:**
- Success: Streams the document content (PDF, image, etc.)
- Error: JSON error message

**Security Features:**
- Origin validation (Vercel → Render only)
- Temporary token validation (backend checks)
- Single-use tokens (backend tracks usage)
- Token expiry (5-15 minutes)
- Backend URL hidden from client

**Environment Variables Required:**
```env
VITE_API_BASE_URL=https://your-backend.onrender.com
```

**Testing:**
```bash
# Get access token from backend
curl -H "Authorization: Bearer YOUR_JWT" \
     https://backend.onrender.com/api/cases/1/documents/1/download-url/

# Use token with proxy
curl "https://your-app.vercel.app/api/proxy-documents?type=case&disputeId=1&docId=1&access=TOKEN"
```

**Vercel Configuration:**
- Automatic deployment when `frontend/` folder changes
- No build step required for serverless functions
- Functions are located in `/api/**/*.js` or `/api/**/*.ts`
- Each file becomes an endpoint: `/api/filename`

**Monitoring:**
- Vercel Dashboard → Functions tab
- View logs, invocations, and errors
- Check function execution time and memory usage

**Deployment:**
```bash
# Commit and push
git add frontend/api/proxy-documents.js
git commit -m "Add document proxy serverless function"
git push origin main

# Vercel auto-deploys (~1-2 minutes)
```

## Adding More Serverless Functions

Create new files in this directory following the same pattern:

```javascript
// frontend/api/my-function.js
export default async function handler(req, res) {
  const { param } = req.query;
  
  // Your logic here
  
  return res.status(200).json({ result: 'success' });
}
```

Access at: `https://your-app.vercel.app/api/my-function?param=value`
