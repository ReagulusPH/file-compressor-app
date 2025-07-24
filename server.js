const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();

// Enable CORS and SharedArrayBuffer headers for all requests
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

const isDevelopment = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || (isDevelopment ? 3001 : 3000);

if (isDevelopment) {
  // In development, proxy to React dev server
  console.log('Development mode: Proxying to React dev server on port 3000');
  
  // Proxy all requests to React dev server
  app.use('/', createProxyMiddleware({
    target: 'http://localhost:3000',
    changeOrigin: true,
    onProxyRes: (proxyRes, req, res) => {
      // Add SharedArrayBuffer headers to proxied responses
      proxyRes.headers['Cross-Origin-Embedder-Policy'] = 'require-corp';
      proxyRes.headers['Cross-Origin-Opener-Policy'] = 'same-origin';
    }
  }));
} else {
  // In production, serve static files
  console.log('Production mode: Serving static files');
  
  // Serve static files from the React app build directory
  app.use(express.static(path.join(__dirname, 'build')));

  // Catch all handler: send back React's index.html file
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('SharedArrayBuffer headers enabled for video compression');
  if (isDevelopment) {
    console.log('Open http://localhost:3001 in your browser (not localhost:3000)');
  }
});