const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 3001;

// Add SharedArrayBuffer headers to all responses
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

// Proxy all requests to React dev server
app.use('/', createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
  ws: true, // Enable WebSocket proxying
  onProxyRes: (proxyRes, req, res) => {
    // Ensure headers are set on proxied responses
    proxyRes.headers['Cross-Origin-Embedder-Policy'] = 'require-corp';
    proxyRes.headers['Cross-Origin-Opener-Policy'] = 'same-origin';
    proxyRes.headers['Cross-Origin-Resource-Policy'] = 'cross-origin';
  }
}));

app.listen(PORT, () => {
  console.log(`🚀 Development server with SharedArrayBuffer support running on http://localhost:${PORT}`);
  console.log('📹 Video compression should now work properly');
  console.log('⚠️  Make sure React dev server is running on port 3000');
});