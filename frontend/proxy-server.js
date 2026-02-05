/**
 * Document proxy server
 * Hides backend API URL by proxying document downloads through frontend
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PROXY_PORT || 3001;

// Environment variables
const BACKEND_URL = process.env.VITE_API_BASE_URL || 'http://localhost:8000';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];

// CORS for frontend
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true
}));

/**
 * Proxy endpoint: GET /proxy/documents/:type/:disputeId/:docId
 * Query params: access (temporary token)
 */
app.get('/proxy/documents/:type/:disputeId/:docId', async (req, res) => {
  const { type, disputeId, docId } = req.params;
  const { access } = req.query;

  if (!access) {
    return res.status(401).json({ error: 'Access token required' });
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
    const response = await fetch(backendUrl);

    if (!response.ok) {
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
