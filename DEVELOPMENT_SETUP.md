# Open WebUI Development Setup Guide

## 🚀 Quick Start

### 1. Environment Setup

Copy the example environment file and configure your API keys:

```bash
# Backend environment
cp backend/.env.example backend/.env
```

Edit `backend/.env` and add your API keys:
```bash
# Required: OpenAI API Key
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional: AWS credentials for Bedrock models
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key

# Optional: LiteLLM master key for proxy
LITELLM_MASTER_KEY=your-secure-master-key
```

### 2. Frontend Development

```bash
# Install dependencies
npm install

# Start frontend development server
npm run dev
```

The frontend will be available at: http://localhost:5173

### 3. Backend Development

```bash
# Navigate to backend directory
cd backend

# Start backend server
./dev-fixed.sh
```

The backend API will be available at: http://localhost:8080

### 4. LiteLLM Proxy (Optional)

For advanced model routing and cloud provider integration:

```bash
# Start LiteLLM service
./start-litellm.sh

# Check status
docker-compose -f litellm-service.yaml logs -f

# Stop service
docker-compose -f litellm-service.yaml down
```

LiteLLM proxy will be available at: http://localhost:40000

## 🔧 Development Scripts

### Frontend Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run check` - Run TypeScript checks
- `npm run test:e2e` - Run end-to-end tests

### Backend Scripts
- `./backend/dev-fixed.sh` - Start backend with SSL fixes
- `./start-litellm.sh` - Start LiteLLM proxy service

## 🔒 Security Notes

- **Never commit API keys** to version control
- Use `.env` files for sensitive configuration
- The `.gitignore` file is configured to exclude `.env` files
- All example files use placeholder values

## 🐛 Troubleshooting

### Socket.io-client Module Error
If you encounter module resolution errors, try:
```bash
rm -rf node_modules package-lock.json
npm install
```

### SSL Certificate Issues on macOS
The `dev-fixed.sh` script automatically handles SSL certificate issues by:
- Setting proper certificate paths
- Disabling SSL verification for development

### Backend Connection Issues
Ensure the backend is running on port 8080 and CORS is properly configured for localhost:5173.

## 📁 Project Structure

```
open-webui/
├── src/                    # Frontend source code
├── backend/               # Backend Python code
├── tests/                 # Test files
├── static/               # Static assets
├── docker-compose.*.yaml # Docker configurations
└── *.config.*           # Build configurations
```

## 🔗 Useful URLs

- Frontend: http://localhost:5173
- Backend API: http://localhost:8080
- LiteLLM Proxy: http://localhost:40000
- API Documentation: http://localhost:8080/docs
