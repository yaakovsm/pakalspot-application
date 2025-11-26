"""rename type column to spot_type

Revision ID: rename_type_to_spot_type
Revises: remove_region_column
Create Date: 2025-11-26

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'rename_type_to_spot_type'
down_revision = 'remove_region_column'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Rename the 'type' column to 'spot_type' in spots table
    op.alter_column('spots', 'type', new_column_name='spot_type')


def downgrade() -> None:
    # Rename back to 'type' if needed
    op.alter_column('spots', 'spot_type', new_column_name='type')

