-- ADAM-Enhanced PostgreSQL Initialization Script
-- This script runs on first container startup

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable pg_trgm for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable uuid-ossp for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'ADAM-Enhanced database initialized successfully';
    RAISE NOTICE 'pgvector extension: enabled';
    RAISE NOTICE 'pg_trgm extension: enabled';
END $$;
