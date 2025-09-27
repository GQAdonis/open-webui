#!/bin/bash

# Load environment variables from .env file if it exists
if [ -f .env ]; then
    echo "Loading environment variables from .env file..."
    export $(grep -v '^#' .env | xargs)
fi

# Set environment variables for development
export CORS_ALLOW_ORIGIN="${CORS_ALLOW_ORIGIN:-http://localhost:5173;http://localhost:8080}"
export PORT="${PORT:-8080}"

# Fix SSL certificate issues on macOS
export SSL_CERT_FILE=$(python -m certifi)
export REQUESTS_CA_BUNDLE=$(python -m certifi)
export CURL_CA_BUNDLE=$(python -m certifi)

# Disable SSL verification for development (not recommended for production)
export PYTHONHTTPSVERIFY=0
export NODE_TLS_REJECT_UNAUTHORIZED=0

# Override OpenAI API configuration to use only direct OpenAI API
export OPENAI_API_BASE_URLS="https://api.openai.com/v1"
# Load OpenAI API key from environment variable or .env file
if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  WARNING: OPENAI_API_KEY environment variable not set!"
    echo "   Please set it with: export OPENAI_API_KEY=your_api_key_here"
    echo "   Or create a .env file in the backend directory"
else
    export OPENAI_API_KEYS="$OPENAI_API_KEY"
fi

# Start the backend server
echo "Starting Open WebUI backend server..."
echo "SSL Certificate path: $SSL_CERT_FILE"
echo "OpenAI API Base URL: $OPENAI_API_BASE_URLS"

uvicorn open_webui.main:app --port $PORT --host 0.0.0.0 --forwarded-allow-ips '*' --reload
