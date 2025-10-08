import os
import psycopg2
from sqlalchemy import create_engine, text
from app.core.settings import settings

# Database connection
engine = create_engine(settings.DB_URL)

try:
    with engine.connect() as conn:
        result = conn.execute(text('SELECT id, email, display_name, created_at FROM users'))
        users = result.fetchall()
        
        print('Users in database:')
        print('=' * 80)
        if users:
            for user in users:
                print(f'ID: {user[0]}')
                print(f'Email: {user[1]}')
                print(f'Display Name: {user[2]}')
                print(f'Created At: {user[3]}')
                print('-' * 40)
        else:
            print('No users found in the database.')
            
        # Also check the table structure
        print('\nTable structure:')
        print('=' * 80)
        result = conn.execute(text("""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        """))
        columns = result.fetchall()
        for col in columns:
            print(f'{col[0]}: {col[1]} (nullable: {col[2]})')
            
except Exception as e:
    print(f'Error: {e}')
