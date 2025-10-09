"""
initial schema with postgis

Revision ID: 20250911_000001
Revises: 
Create Date: 2025-09-11
"""

from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry


# revision identifiers, used by Alembic.
revision = '20250911_000001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

    op.create_table(
        'users',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('email', sa.String(), nullable=False, unique=True),
        sa.Column('password_hash', sa.Text(), nullable=False),
        sa.Column('display_name', sa.Text(), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()')),
    )

    op.create_table(
        'spots',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.Text(), nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('type', sa.Text(), nullable=False),
        sa.Column('region', sa.Text(), nullable=False),
        sa.Column('geom', Geometry('POINT', srid=4326), nullable=False),
        sa.Column('popularity', sa.Integer(), server_default='0'),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()')),
    )

    op.create_table(
        'photos',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('spot_id', sa.String(), sa.ForeignKey('spots.id', ondelete='CASCADE'), nullable=False),
        sa.Column('object_key', sa.Text(), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()')),
    )

    op.create_table(
        'likes',
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('spot_id', sa.String(), sa.ForeignKey('spots.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('is_like', sa.Boolean(), nullable=False),
    )

    op.create_table(
        'favorites',
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('spot_id', sa.String(), sa.ForeignKey('spots.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()')),
    )

    op.execute("CREATE INDEX IF NOT EXISTS idx_spots_geom ON spots USING GIST (geom);")


def downgrade() -> None:
    op.drop_table('favorites')
    op.drop_table('likes')
    op.drop_table('photos')
    op.drop_table('spots')
    op.drop_table('users')

