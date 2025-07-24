# Deployment Guide

## Quick Deploy Options

### Option 1: Docker Compose (Recommended)
```bash
# Using docker-compose
chmod +x deploy-compose.sh
./deploy-compose.sh
```

### Option 2: Direct Docker
```bash
# Using direct docker commands
chmod +x deploy.sh
./deploy.sh
```

## Manual Steps

### 1. On Your LXC Container

#### Docker Compose Method (Recommended)
```bash
# Clone repo (if not done)
git clone https://github.com/yourusername/your-repo.git
cd your-repo

# Deploy with Docker Compose
./deploy-compose.sh

# Or manually:
docker-compose up -d --build
```

#### Direct Docker Method
```bash
# Deploy with direct Docker
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

### Docker Compose Commands
```bash
# Check service status
docker-compose ps

# View real-time logs
docker-compose logs -f

# Check resource usage
docker-compose top

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Stop and remove everything
docker-compose down --volumes --remove-orphans
```

### Direct Docker Commands
```bash
# Check container status
docker ps | grep file-compressor

# View real-time logs
docker logs -f file-compressor

# Check resource usage
docker stats file-compressor

# Restart container
docker restart file-compressor

# Stop container
docker stop file-compressor
```

### Health Checks
```bash
# Test health endpoint
curl http://localhost:3000/health

# Check container health status
docker inspect file-compressor | grep Health -A 10
```

## Update Process

### Docker Compose Method
```bash
# Pull latest changes
git pull

# Redeploy with Docker Compose
./deploy-compose.sh

# Or manually:
docker-compose down
docker-compose up -d --build
```

### Direct Docker Method
```bash
# Pull latest changes
git pull

# Redeploy
./deploy.sh
```