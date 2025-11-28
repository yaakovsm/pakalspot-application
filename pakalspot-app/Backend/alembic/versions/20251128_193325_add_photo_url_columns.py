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


def upgrade():
    # Add url column as nullable first
    op.add_column('photos', sa.Column('url', sa.Text(), nullable=True))
    
    # Add thumbnail_url column as nullable
    op.add_column('photos', sa.Column('thumbnail_url', sa.Text(), nullable=True))
    
    # Populate existing rows with URLs based on object_key
    # Extract filename from object_key (last part after '/')
    # URL format: http://pakalspot.com/media/{filename}
    # Use regexp_replace to extract filename: get everything after the last '/', or the whole string if no '/'
    op.execute("""
        UPDATE photos
        SET url = 'http://pakalspot.com/media/' || regexp_replace(object_key, '^.*/', ''),
            thumbnail_url = 'http://pakalspot.com/media/' || regexp_replace(object_key, '^.*/', '')
        WHERE url IS NULL
    """)
    
    # Now make url column NOT NULL
    op.alter_column('photos', 'url', nullable=False)


def downgrade():
    # Drop the columns
    op.drop_column('photos', 'thumbnail_url')
    op.drop_column('photos', 'url')

