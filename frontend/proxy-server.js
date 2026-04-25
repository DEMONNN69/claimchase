/**
 * Document proxy server
 * Hides backend API URL by proxying document downloads through frontend
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PROXY_PORT || 3001;

// Environment variables
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:8080'];
// The public origin this proxy is reachable from — sent as Origin/Referer to Django's
// ALLOWED_DOCUMENT_ORIGINS check. In dev this is http://localhost:8080 (Vite). In
// production set PROXY_PUBLIC_ORIGIN=https://yourdomain.com via environment variable.
const PUBLIC_ORIGIN = process.env.PROXY_PUBLIC_ORIGIN || 'http://localhost:8080';

// CORS for frontend
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true
}));

/**
 * Proxy endpoint: GET /api/proxy-documents
 * Query params: type, disputeId, docId, access
 * 
 * Matches Vercel serverless function format for consistency
 */
app.get('/api/proxy-documents', async (req, res) => {
  const { type, disputeId, docId, access } = req.query;

  // Validate required parameters
  if (!type || !disputeId || !docId || !access) {
    return res.status(400).json({ 
      error: 'Missing required parameters: type, disputeId, docId, access' 
    });
  }

  // Validate type
  if (!['case', 'dispute'].includes(type)) {
    return res.status(400).json({ error: 'Invalid document type' });
  }

  // Construct backend URL
  const endpoint = type === 'case' ? 'cases' : 'disputes';
  const backendUrl = `${BACKEND_URL}/api/${endpoint}/${disputeId}/documents/${docId}/download/?access=${access}`;

  try {
    // Fetch from backend (server-to-server, backend URL hidden from client)
    const response = await fetch(backendUrl, {
      headers: {
        'Origin': PUBLIC_ORIGIN,
        'Referer': PUBLIC_ORIGIN + '/',
      }
    });

    if (!response.ok) {
      console.error(`Backend error: ${response.status} for ${backendUrl}`);
      return res.status(response.status).json({ 
        error: response.status === 404 ? 'Document not found' : 'Access denied' 
      });
    }

    // Get content type and disposition from backend
    const contentType = response.headers.get('content-type') || 'application/pdf';
    const contentDisposition = response.headers.get('content-disposition') || 'inline';
    const contentLength = response.headers.get('content-length');

    // Set headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', contentDisposition);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Stream file content
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Failed to load document' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', backend: BACKEND_URL });
});

app.listen(PORT, () => {
  console.log(`📄 Document proxy server running on port ${PORT}`);
  console.log(`🔒 Backend URL: ${BACKEND_URL} (hidden from clients)`);
  console.log(`✅ Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
});
