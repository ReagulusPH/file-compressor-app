#!/bin/bash
# LXC Container Setup Script for File Compressor App

# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install nginx
apt-get install -y nginx

# Install PM2 for process management
npm install -g pm2

# Create app directory
mkdir -p /var/www/file-compressor
cd /var/www/file-compressor

# Clone and build app (replace with your repo)
# git clone <your-repo-url> .
# npm ci
# npm run build

# Copy built files to nginx
cp -r build/* /var/www/html/

# Configure nginx
cat > /etc/nginx/sites-available/file-compressor << 'EOF'
server {
    listen 80;
    server_name _;
    root /var/www/html;
    index index.html;

    # SharedArrayBuffer headers for FFmpeg
    add_header Cross-Origin-Embedder-Policy require-corp always;
    add_header Cross-Origin-Opener-Policy same-origin always;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/file-compressor /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Start services
systemctl enable nginx
systemctl start nginx

echo "Setup complete! App running on port 80"