# Deployment Guide

## Quick Deploy
```bash
# Make script executable and run
chmod +x deploy.sh
./deploy.sh
```

## Manual Steps

### 1. On Your LXC Container
```bash
# Clone repo (if not done)
git clone https://github.com/yourusername/your-repo.git
cd your-repo

# Deploy
./deploy.sh
```

### 2. NGINX Proxy Manager Configuration

**Proxy Host Settings:**
- Domain: `filecompressor.konnektline.com`
- Scheme: `http`
- Forward Hostname/IP: `your-lxc-container-ip`
- Forward Port: `3000`

**Advanced Tab - Add these headers:**
```nginx
# Essential for SharedArrayBuffer support
proxy_set_header Cross-Origin-Embedder-Policy require-corp;
proxy_set_header Cross-Origin-Opener-Policy same-origin;

# Standard proxy headers
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;

# Increase timeout for large file uploads
proxy_read_timeout 300;
proxy_connect_timeout 300;
proxy_send_timeout 300;
```

**SSL Tab:**
- Request new SSL certificate
- Use Let's Encrypt
- Force SSL: Yes

### 3. Cloudflare Settings

**SSL/TLS Mode:** Full (strict)

**Page Rules (Optional):**
- URL: `filecompressor.konnektline.com/*`
- Settings: 
  - Browser Cache TTL: 4 hours
  - Cache Level: Standard

## Troubleshooting

### Issue: SharedArrayBuffer not available
**Solution:** Ensure these headers are set in NPM:
```
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

### Issue: FFmpeg fails to load
**Symptoms:** Console errors about WebAssembly
**Solution:** 
1. Check browser compatibility (Chrome 67+, Firefox 79+, Safari 15.2+)
2. Verify WASM files are served with correct MIME type
3. Check network tab for failed resource loads

### Issue: Large files fail to upload
**Solution:** Add to NPM Advanced config:
```nginx
client_max_body_size 100M;
proxy_read_timeout 300;
```

### Issue: App loads but compression fails
**Check:**
1. Browser console for JavaScript errors
2. Network tab for failed API calls
3. Container logs: `docker logs file-compressor`

## Monitoring Commands

```bash
# Check container status
docker ps | grep file-compressor

# View real-time logs
docker logs -f file-compressor

# Check resource usage
docker stats file-compressor

# Test health endpoint
curl http://localhost:3000/health

# Restart container
docker restart file-compressor
```

## Update Process

```bash
# Pull latest changes
git pull

# Redeploy
./deploy.sh
```