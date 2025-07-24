#!/bin/bash

# File Compressor Docker Compose Deployment Script
set -e

echo "🚀 Starting Docker Compose deployment..."

# Stop existing services
echo "🛑 Stopping existing services..."
docker-compose down --remove-orphans 2>/dev/null || true

# Remove old images (optional - uncomment if you want to force rebuild)
# echo "🗑️  Removing old images..."
# docker-compose down --rmi all 2>/dev/null || true

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up -d --build

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Check if container is running
if docker-compose ps | grep -q "Up"; then
    echo "✅ Services are running!"
    
    # Test health endpoint
    echo "🔍 Testing health endpoint..."
    for i in {1..10}; do
        if curl -f http://localhost:3000/health > /dev/null 2>&1; then
            echo "✅ Health check passed!"
            break
        else
            echo "⏳ Waiting for health check... ($i/10)"
            sleep 3
        fi
        
        if [ $i -eq 10 ]; then
            echo "❌ Health check failed after 10 attempts!"
            docker-compose logs
            exit 1
        fi
    done
    
    echo "🎉 Deployment successful!"
    echo "📱 App is running at: http://localhost:3000"
    echo "📊 View logs with: docker-compose logs -f"
    echo "🛑 Stop with: docker-compose down"
else
    echo "❌ Services failed to start!"
    docker-compose logs
    exit 1
fi