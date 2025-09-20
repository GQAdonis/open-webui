#!/bin/bash
set -e

echo "🚀 Setting up Open WebUI Production Environment with PostgreSQL and pgvector"

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check for NVIDIA Docker support
echo "🔍 Checking NVIDIA Docker support..."
if ! docker run --rm --gpus all nvidia/cuda:11.0.3-base-ubuntu20.04 nvidia-smi &> /dev/null; then
    echo "❌ NVIDIA Docker support not found. Please install nvidia-container-toolkit."
    echo "Run: sudo apt update && sudo apt install -y nvidia-container-toolkit"
    echo "Then: sudo systemctl restart docker"
    exit 1
fi

echo "✅ NVIDIA Docker support detected"

# Check for port conflicts
echo "🔍 Checking for port conflicts..."
if ss -tlnp | grep -E ':(3001|5433|11435)' >/dev/null 2>&1; then
    echo "⚠️  Warning: Some ports (3001, 5433, 11435) are in use."
    echo "   Services will be bound to localhost only to minimize conflicts."
fi

# Generate a secure secret key if not set
if grep -q "WEBUI_SECRET_KEY=$" .env; then
    echo "🔑 Generating secure secret key..."
    SECRET_KEY=$(openssl rand -base64 32)
    sed -i "s/WEBUI_SECRET_KEY=$/WEBUI_SECRET_KEY=${SECRET_KEY}/" .env
    echo "✅ Secret key generated and set"
fi

# Create backup of existing volumes (if any)
echo "📦 Checking for existing volumes..."
if docker volume ls -q | grep -q "ollama_data\|open_webui_data\|postgres_openwebui_data"; then
    echo "⚠️  Existing volumes found. They will be preserved."
fi

echo "✅ Environment setup complete!"
echo ""
echo "📋 Deployment Steps:"
echo ""
echo "1. 🚀 Build and start services:"
echo "   docker compose -f docker-compose.production.yaml up -d --build"
echo ""
echo "2. 📥 Pull the embedding model (after services are running):"
echo "   docker exec ollama ollama pull nomic-embed-text"
echo ""
echo "3. 🌐 Install nginx configurations:"
echo "   sudo cp nginx/openweb.prometheusags.ai.conf /etc/nginx/sites-available/"
echo "   sudo cp nginx/ollama.prometheusags.ai.conf /etc/nginx/sites-available/"
echo "   sudo ln -sf /etc/nginx/sites-available/openweb.prometheusags.ai.conf /etc/nginx/sites-enabled/"
echo "   sudo ln -sf /etc/nginx/sites-available/ollama.prometheusags.ai.conf /etc/nginx/sites-enabled/"
echo "   sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "4. 🔐 Ensure SSL certificates are at:"
echo "   /etc/ssl/certs/star_prometheusags_ai.crt"
echo "   /etc/ssl/certs/star_prometheusags_ai.key"
echo ""
echo "5. 👥 Create your admin user by signing up at:"
echo "   https://openweb.prometheusags.ai"
echo ""
echo "🌐 Service URLs:"
echo "   📱 Open WebUI: https://openweb.prometheusags.ai"
echo "   🤖 Ollama API: https://ollama.prometheusags.ai"
echo ""
echo "🔧 Local Service Ports (localhost only):"
echo "   📱 Open WebUI: http://127.0.0.1:3001"
echo "   🤖 Ollama API: http://127.0.0.1:11435"
echo "   🗄️  PostgreSQL: postgresql://127.0.0.1:5433/openwebui"
echo ""
echo "📊 Features enabled:"
echo "   ✅ Multiuser authentication with login/signup"
echo "   ✅ PostgreSQL 17 with pgvector for user data and vectors"
echo "   ✅ GPU acceleration (T4) for Ollama"
echo "   ✅ RAG with hybrid search capabilities"
echo "   ✅ Secure SSL termination with nginx"
echo ""
echo "🔧 Management commands:"
echo "   Check status: docker compose -f docker-compose.production.yaml ps"
echo "   View logs: docker compose -f docker-compose.production.yaml logs -f"
echo "   Access DB: docker exec -it postgres-openwebui psql -U openwebui -d openwebui"
