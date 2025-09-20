# Open WebUI Production Setup with PostgreSQL & pgvector

This setup configures Open WebUI with multiuser authentication, PostgreSQL 17 + pgvector for both user data and RAG vectors, and GPU acceleration behind nginx with SSL termination.

## Architecture

- **Open WebUI**: https://openweb.prometheusags.ai (port 3000 internally)
- **Ollama API**: https://ollama.prometheusags.ai (port 11434 internally)
- **PostgreSQL**: Internal database with pgvector extension (port 5432)
- **SSL**: Wildcard certificates for *.prometheusags.ai
- **GPU**: NVIDIA T4 support for Ollama inference

## Key Features

✅ **Multiuser Support**: Full authentication with login/signup functionality  
✅ **PostgreSQL + pgvector**: Single database for both user data and vector storage  
✅ **RAG with Hybrid Search**: Advanced retrieval-augmented generation  
✅ **GPU Acceleration**: T4 support for fast inference  
✅ **Production Security**: SSL, proper CORS, security headers  
✅ **Persistent Storage**: All data persisted in Docker volumes  

## Quick Start

### 1. Run Setup Script
```bash
./setup-production.sh
```

### 2. Start Services
```bash
docker compose -f docker-compose.production.yaml up -d --build
```

### 3. Pull Embedding Model
```bash
# Wait for Ollama to start, then:
docker exec ollama ollama pull nomic-embed-text
```

### 4. Configure Nginx
```bash
sudo cp nginx/openweb.prometheusags.ai.conf /etc/nginx/sites-available/
sudo cp nginx/ollama.prometheusags.ai.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/openweb.prometheusags.ai.conf /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/ollama.prometheusags.ai.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 5. Create Admin User
Visit https://openweb.prometheusags.ai and sign up with your admin account.

## Prerequisites

- Docker with NVIDIA GPU support
- nginx installed and running
- SSL certificates at `/etc/ssl/certs/star_prometheusags_ai.[crt/key]`
- DNS records pointing to this server:
  - openweb.prometheusags.ai
  - ollama.prometheusags.ai

## Service Management

### Start services:
```bash
docker compose -f docker-compose.production.yaml up -d
```

### Stop services:
```bash
docker compose -f docker-compose.production.yaml down
```

### View logs:
```bash
docker compose -f docker-compose.production.yaml logs -f [service_name]
```

### Restart with rebuild:
```bash
docker compose -f docker-compose.production.yaml down
docker compose -f docker-compose.production.yaml up -d --build
```

## Database Management

### Connect to PostgreSQL:
```bash
docker exec -it postgres-openwebui psql -U openwebui -d openwebui
```

### Verify pgvector installation:
```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
\dx vector
```

### Check vector tables:
```sql
\dt
-- Look for vector-related tables created by Open WebUI
```

### Database Backup:
```bash
docker exec postgres-openwebui pg_dump -U openwebui openwebui > backup.sql
```

### Database Restore:
```bash
cat backup.sql | docker exec -i postgres-openwebui psql -U openwebui -d openwebui
```

## GPU Verification

### Check GPU availability:
```bash
docker exec ollama nvidia-smi
```

### Monitor GPU usage:
```bash
watch -n 1 'docker exec ollama nvidia-smi'
```

## Model Management

### Pull models via Ollama API:
```bash
curl -X POST https://ollama.prometheusags.ai/api/pull \
     -H "Content-Type: application/json" \
     -d '{"name": "llama3.2:latest"}'
```

### List installed models:
```bash
curl https://ollama.prometheusags.ai/api/tags
```

### Pull embedding model (required for RAG):
```bash
docker exec ollama ollama pull nomic-embed-text
```

## RAG Configuration

The setup includes:
- **Vector Database**: pgvector in the same PostgreSQL instance
- **Embedding Model**: nomic-embed-text (via Ollama)
- **Hybrid Search**: BM25 + Vector similarity
- **Chunking**: 1000 chars with 100 overlap

### Test RAG Functionality:
1. Upload a document via the UI
2. Ask questions about the document content
3. Verify responses include source citations

## Security Features

- **HTTPS**: All traffic redirected to SSL
- **HSTS**: HTTP Strict Transport Security enabled
- **Authentication**: Required for all users
- **API Keys**: Supported for programmatic access
- **Rate Limiting**: Applied to Ollama API
- **CORS**: Restricted to your domain
- **Database**: Secured with scram-sha-256 authentication

## Monitoring

### Check service health:
```bash
docker compose -f docker-compose.production.yaml ps
docker compose -f docker-compose.production.yaml top
```

### Monitor resources:
```bash
docker stats
```

### Check nginx status:
```bash
sudo systemctl status nginx
sudo nginx -t
```

### Database connection test:
```bash
docker exec postgres-openwebui pg_isready -U openwebui -d openwebui
```

## Troubleshooting

### GPU not available:
1. Install nvidia-container-toolkit: `sudo apt install nvidia-container-toolkit`
2. Restart Docker: `sudo systemctl restart docker`
3. Test: `docker run --rm --gpus all nvidia/cuda:11.0.3-base-ubuntu20.04 nvidia-smi`

### Database connection issues:
1. Check PostgreSQL is running: `docker compose ps postgres`
2. Check logs: `docker compose logs postgres`
3. Verify network: `docker network inspect openwebui_network`

### Authentication not working:
1. Verify `WEBUI_AUTH=True` in environment
2. Check database connectivity
3. Look for migration errors in Open WebUI logs

### RAG not working:
1. Ensure embedding model is pulled: `docker exec ollama ollama list`
2. Check pgvector extension: Connect to DB and run `\dx vector`
3. Verify vector database config in logs

### SSL certificate issues:
1. Verify certificates exist: `ls -la /etc/ssl/certs/star_prometheusags_ai.*`
2. Check permissions: `sudo chmod 644 /etc/ssl/certs/star_prometheusags_ai.crt`
3. Test nginx config: `sudo nginx -t`

## File Structure

```
.
├── docker-compose.production.yaml  # Production Docker Compose
├── init-db.sql                     # PostgreSQL initialization
├── .env                            # Environment variables
├── nginx/                          # Nginx configurations
│   ├── openweb.prometheusags.ai.conf
│   └── ollama.prometheusags.ai.conf
├── setup-production.sh             # Setup script
└── README-PRODUCTION.md            # This file
```

## Environment Variables Reference

### Database
- `DATABASE_URL`: PostgreSQL connection string
- `PGVECTOR_DB_URL`: Same as DATABASE_URL for vector storage
- `VECTOR_DB=pgvector`: Use pgvector for vectors

### Authentication
- `WEBUI_AUTH=True`: Enable authentication
- `ENABLE_SIGNUP=True`: Allow new user registration
- `DEFAULT_USER_ROLE=pending`: New users need approval

### RAG
- `RAG_EMBEDDING_ENGINE=ollama`: Use Ollama for embeddings
- `RAG_EMBEDDING_MODEL=nomic-embed-text`: Embedding model
- `ENABLE_RAG_HYBRID_SEARCH=true`: Enable hybrid search

## Backup Strategy

### Full backup script:
```bash
#!/bin/bash
BACKUP_DIR="/backup/openwebui/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Database backup
docker exec postgres-openwebui pg_dump -U openwebui openwebui > "$BACKUP_DIR/database.sql"

# Volume backups
docker run --rm -v ollama_data:/data -v "$BACKUP_DIR:/backup" alpine tar czf /backup/ollama_data.tar.gz -C /data .
docker run --rm -v open_webui_data:/data -v "$BACKUP_DIR:/backup" alpine tar czf /backup/open_webui_data.tar.gz -C /data .

echo "Backup completed: $BACKUP_DIR"
```

## Production Tips

1. **Monitor disk space**: Vector data can grow large
2. **Regular backups**: Especially before updates
3. **Log rotation**: Configure for long-running deployments  
4. **Resource monitoring**: Watch CPU/GPU/Memory usage
5. **Security updates**: Keep containers updated regularly

## Scaling Considerations

- **Database**: PostgreSQL can handle significant load
- **Vector search**: pgvector scales well with proper indexing
- **Ollama**: Consider multiple instances for high load
- **nginx**: Can handle thousands of concurrent connections
- **Storage**: Use SSDs for better database performance
