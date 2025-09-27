#!/bin/bash

# Script to start LiteLLM service for Open WebUI development

echo "Starting LiteLLM service..."

# Create network if it doesn't exist
docker network create openwebui_network 2>/dev/null || echo "Network openwebui_network already exists"

# Start LiteLLM service
docker-compose -f litellm-service.yaml up -d

echo "LiteLLM service started on port 40000"
echo "You can now run the backend with: ./backend/dev-fixed.sh"
echo ""
echo "To check LiteLLM status: docker-compose -f litellm-service.yaml logs -f"
echo "To stop LiteLLM: docker-compose -f litellm-service.yaml down"
