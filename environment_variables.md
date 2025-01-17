

Here's the enhanced table of OpenWebUI environment variables including default values:

| Environment Variable | Default Value | Valid Values | Purpose |
|---------------------|---------------|--------------|----------|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | URL (e.g., `http://localhost:11434`) | Specifies the base URL for the Ollama API endpoint |
| `HOST` | `127.0.0.1` | IP/hostname (e.g., `0.0.0.0`, `localhost`, domain name) | Defines the host interface the application binds to |
| `PORT` | `8080` | Number | Specifies the port the application listens on |
| `ENABLE_WORKSPACES` | `false` | `true`/`false` | Enables/disables workspace functionality |
| `WEBUI_SECRET_KEY` | Empty string | String | Secret key for session management and security |
| `WEBUI_JWT_SECRET_KEY` | Auto-generated | String | Secret key for JWT token generation |
| `ALLOW_REGISTRATION` | `true` | `true`/`false` | Controls whether new user registration is allowed |
| `ENABLE_SIGNUP` | `true` | `true`/`false` | Alternative to ALLOW_REGISTRATION |
| `ENABLE_AUDIT_LOGS` | `false` | `true`/`false` | Enables/disables audit logging |
| `AUDIT_LOGS_PATH` | `/app/backend/data/audit.log` | Path string | Specifies the path for audit logs |
| `ENABLE_USER_API_KEYS` | `false` | `true`/`false` | Enables/disables user API key generation |
| `DISABLE_UPDATE_CHECK` | `false` | `true`/`false` | Disables automatic update checking |
| `DATA_PATH` | `/app/backend/data` | Path string | Path for application data storage |
| `LOG_LEVEL` | `info` | `debug`/`info`/`warning`/`error` | Sets the application logging level |
| `OPENAI_API_KEY` | Empty string | String | API key for OpenAI integration (if used) |
| `OPENAI_API_BASE_URL` | `https://api.openai.com/v1` | URL | Custom base URL for OpenAI API |
| `RAG_EMBEDDING_MODEL` | `all-minilm-l6-v2` | String | Specifies the embedding model for RAG functionality |
| `DEFAULT_MODELS` | Empty string | Comma-separated string | List of default models to show |
| `ENABLE_MULTI_USERS` | `false` | `true`/`false` | Enables/disables multi-user support |
| `ENABLE_SECURE_MODE` | `false` | `true`/`false` | Enables additional security features |
| `DISABLE_TELEMETRY` | `false` | `true`/`false` | Disables telemetry data collection |
| `PROXY_URL` | Empty string | URL | Proxy server URL for API requests |
| `NODE_OPTIONS` | `--max-old-space-size=4096` | String | Node.js runtime options |

Note: These defaults are based on typical configurations, but some might vary depending on your specific version of OpenWebUI. Always check the official documentation or source code for the most accurate default values for your version.