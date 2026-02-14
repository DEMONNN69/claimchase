/**
 * Vercel Serverless Function - Document Proxy
 * 
 * This function runs on Vercel Edge Network and proxies document requests
 * to the backend, hiding the backend URL from the browser.
 * 
 * URL Pattern: /api/proxy-documents?type=case&disputeId=1&docId=5&access=token
 */

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, disputeId, docId, access } = req.query;

    // Validate required parameters
    if (!type || !disputeId || !docId || !access) {
      return res.status(400).json({ 
        error: 'Missing required parameters: type, disputeId, docId, access' 
      });
    }

    // Validate type
    if (!['case', 'dispute'].includes(type)) {
      return res.status(400).json({ error: 'Invalid document type. Must be "case" or "dispute"' });
    }

    // Get backend URL from environment variable
    // Note: Vercel serverless functions use plain env vars, not VITE_ prefixed ones
    const backendUrl = process.env.API_BASE_URL || 
                       process.env.VITE_API_BASE_URL || 
                       process.env.NEXT_PUBLIC_API_URL;
    
    if (!backendUrl) {
      console.error('Backend URL not configured. Available env vars:', Object.keys(process.env).filter(k => k.includes('API') || k.includes('URL')));
      return res.status(500).json({ error: 'Server configuration error' });
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Construct backend API URL
    const endpoint = type === 'case' ? 'cases' : 'disputes';
    const apiUrl = `${backendUrl}/api/${endpoint}/${disputeId}/documents/${docId}/download/?access=${access}`;

    console.log(`[Proxy] Fetching from backend: ${apiUrl}`);

    // Fetch document from backend (server-to-server, backend URL hidden from browser)
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Origin': `https://${req.headers.host}`,
        'Referer': `https://${req.headers.host}/`,
        'User-Agent': 'Vercel-Proxy-Function/1.0',
      },
    });

    // Handle backend errors
    if (!response.ok) {
      console.error(`[Proxy] Backend returned ${response.status}`);
      
      if (response.status === 404) {
        return res.status(404).json({ error: 'Document not found' });
      } else if (response.status === 403) {
        return res.status(403).json({ error: 'Access denied or token expired' });
      } else {
        return res.status(response.status).json({ error: 'Failed to load document' });
      }
    }

    // Get content headers from backend
    const contentType = response.headers.get('content-type') || 'application/pdf';
    const contentDisposition = response.headers.get('content-disposition') || 'inline';
    const contentLength = response.headers.get('content-length');

    // Set response headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', contentDisposition);
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Stream the document content from backend to client
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log(`[Proxy] Successfully proxied ${contentType} (${buffer.length} bytes)`);
    
    return res.status(200).send(buffer);

  } catch (error) {
    console.error('[Proxy] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to proxy document request',
      message: error.message 
    });
  }
}

// Vercel serverless function configuration
export const config = {
  api: {
    bodyParser: false, // Don't parse body, we're streaming
    responseLimit: '10mb', // Allow large files (adjust as needed)
  },
};
