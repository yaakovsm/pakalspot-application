"""add url and thumbnail_url columns to photos

Revision ID: 20251128_193325
Revises: 20250120_000001
Create Date: 2025-11-28 19:33:25.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20251128_193325'
down_revision = '20250120_000001'
branch_labels = None
depends_on = None


def column_exists(table_name: str, column_name: str) -> bool:
    """Check if a column exists in a table using information_schema."""
    connection = op.get_bind()
    result = connection.execute(
        sa.text(
            """
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = :table_name
                AND column_name = :column_name
            )
            """
        ),
        {"table_name": table_name, "column_name": column_name}
    )
    return result.scalar()


def column_is_nullable(table_name: str, column_name: str) -> bool:
    """Check if a column is nullable."""
    connection = op.get_bind()
    result = connection.execute(
        sa.text(
            """
            SELECT is_nullable = 'YES'
            FROM information_schema.columns
            WHERE table_name = :table_name
            AND column_name = :column_name
            """
        ),
        {"table_name": table_name, "column_name": column_name}
    )
    return result.scalar() if result.rowcount > 0 else True


def upgrade():
    table_name = 'photos'
    url_column_exists = column_exists(table_name, 'url')
    thumbnail_url_column_exists = column_exists(table_name, 'thumbnail_url')
    
    # Add url column as nullable first (only if it doesn't exist)
    if not url_column_exists:
        op.add_column(table_name, sa.Column('url', sa.Text(), nullable=True))
    
    # Add thumbnail_url column as nullable (only if it doesn't exist)
    if not thumbnail_url_column_exists:
        op.add_column(table_name, sa.Column('thumbnail_url', sa.Text(), nullable=True))
    
    # Populate existing rows with URLs based on object_key
    # Only populate if columns were just created or if data is missing
    # Extract filename from object_key (last part after '/')
    # URL format: http://pakalspot.com/media/{filename}
    # Use regexp_replace to extract filename: get everything after the last '/', or the whole string if no '/'
    op.execute("""
        UPDATE photos
        SET url = 'http://pakalspot.com/media/' || regexp_replace(object_key, '^.*/', ''),
            thumbnail_url = 'http://pakalspot.com/media/' || regexp_replace(object_key, '^.*/', '')
        WHERE url IS NULL
    """)
    
    # Now make url column NOT NULL (only if it's currently nullable)
    if column_is_nullable(table_name, 'url'):
        op.alter_column(table_name, 'url', nullable=False)


def downgrade():
    table_name = 'photos'
    
    # Drop the columns (only if they exist)
    if column_exists(table_name, 'thumbnail_url'):
        op.drop_column(table_name, 'thumbnail_url')
    
    if column_exists(table_name, 'url'):
        op.drop_column(table_name, 'url')

