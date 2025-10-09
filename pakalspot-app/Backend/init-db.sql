-- Database initialization script for PakalSpot
-- This script creates the database user and grants necessary permissions

-- Create the user if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'pakalspot_user') THEN
        CREATE USER pakalspot_user WITH PASSWORD 'jcoffeebrew';
    END IF;
END
$$;

-- Create the database if it doesn't exist
SELECT 'CREATE DATABASE pakalspot_db OWNER pakalspot_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'pakalspot_db')\gexec

-- Grant all privileges on the database to the user
GRANT ALL PRIVILEGES ON DATABASE pakalspot_db TO pakalspot_user;

-- Connect to the database and grant schema privileges
\c pakalspot_db;
GRANT ALL ON SCHEMA public TO pakalspot_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO pakalspot_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO pakalspot_user;
