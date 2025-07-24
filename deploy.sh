#!/bin/bash

# File Compressor Deployment Script
set -e

echo "🚀 Starting deployment..."

# Stop and remove existing container
echo "📦 Stopping existing container..."
docker stop file-compressor 2>/dev/null || true
docker rm file-compressor 2>/dev/null || true

# Remove old image
echo "🗑️  Removing old image..."
docker rmi file-compressor 2>/dev/null || true

# Build new image
echo "🔨 Building new Docker image..."
docker build -t file-compressor .

# Run container
echo "🏃 Starting new container..."
docker run -d \
  --name file-compressor \
  --restart unless-stopped \
  -p 3000:80 \
  file-compressor

# Wait for container to start
echo "⏳ Waiting for container to start..."
sleep 5

# Check if container is running
if docker ps | grep -q file-compressor; then
    echo "✅ Container is running!"
    
    # Test health endpoint
    echo "🔍 Testing health endpoint..."
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        echo "✅ Health check passed!"
    else
        echo "❌ Health check failed!"
        docker logs file-compressor
        exit 1
    fi
    
    echo "🎉 Deployment successful!"
    echo "📱 App is running at: http://localhost:3000"
    echo "📊 View logs with: docker logs -f file-compressor"
else
    echo "❌ Container failed to start!"
    docker logs file-compressor
    exit 1
fi