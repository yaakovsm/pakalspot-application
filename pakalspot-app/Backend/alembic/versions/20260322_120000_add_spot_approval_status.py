"""add spots.approval_status for moderation

Revision ID: 20260322_120000
Revises: 20251223_100132
Create Date: 2026-03-22 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "20260322_120000"
down_revision = "20251223_100132"
branch_labels = None
depends_on = None


def column_exists(table_name: str, column_name: str) -> bool:
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
        {"table_name": table_name, "column_name": column_name},
    )
    return result.scalar()


def upgrade() -> None:
    table_name = "spots"
    column_name = "approval_status"

    if not column_exists(table_name, column_name):
        op.add_column(
            table_name,
            sa.Column(
                column_name,
                sa.String(length=20),
                nullable=False,
                server_default="approved",
            ),
        )
        op.execute(
            sa.text(
                "UPDATE spots SET approval_status = 'approved' WHERE approval_status IS NULL"
            )
        )


def downgrade() -> None:
    table_name = "spots"
    column_name = "approval_status"

    if column_exists(table_name, column_name):
        op.drop_column(table_name, column_name)
