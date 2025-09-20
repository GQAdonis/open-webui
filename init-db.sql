-- Initialize PostgreSQL database for Open WebUI with pgvector extension
-- This script runs automatically when the container first starts

-- Create the vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create additional useful extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Set up proper permissions
GRANT ALL PRIVILEGES ON DATABASE openwebui TO openwebui;
GRANT ALL ON SCHEMA public TO openwebui;
GRANT CREATE ON SCHEMA public TO openwebui;

-- Create indices for better performance
-- These will be created by Open WebUI's migration system, but we can prepare the schema

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'Open WebUI PostgreSQL database initialized successfully with pgvector support';
    RAISE NOTICE 'Extensions available: %', (SELECT string_agg(extname, ', ') FROM pg_extension);
END$$;
