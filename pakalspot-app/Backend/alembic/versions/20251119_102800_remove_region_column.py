"""remove region column

Revision ID: remove_region_column
Revises: 20250115_000002_add_location_name_to_spots
Create Date: 2025-11-19

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'remove_region_column'
down_revision = '20250115_000002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the region column from spots table
    op.drop_column('spots', 'region')


def downgrade() -> None:
    # Add region column back (as TEXT to match original migration)
    op.add_column('spots', sa.Column('region', sa.Text(), nullable=False, server_default='golan'))