"""add spots.type column if missing

Revision ID: 20251223_100132
Revises: 20251128_193325
Create Date: 2025-12-23 10:01:32.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20251223_100132'
down_revision = '20251128_193325'
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


def upgrade():
    table_name = 'spots'
    column_name = 'type'
    
    # Check if type column exists
    if not column_exists(table_name, column_name):
        # Add type column as nullable first (in case there are existing rows)
        op.add_column(table_name, sa.Column(column_name, sa.Text(), nullable=True))
        
        # Populate existing rows with a default value
        # Using 'viewpoint' as the default spot type
        op.execute("""
            UPDATE spots
            SET type = 'viewpoint'
            WHERE type IS NULL
        """)
        
        # Now make the column NOT NULL
        op.alter_column(table_name, column_name, nullable=False)


def downgrade():
    table_name = 'spots'
    column_name = 'type'
    
    # Drop the column (only if it exists)
    if column_exists(table_name, column_name):
        op.drop_column(table_name, column_name)

