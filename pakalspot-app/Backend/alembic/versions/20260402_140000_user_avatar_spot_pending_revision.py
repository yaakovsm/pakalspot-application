"""user avatar_url and spot pending_revision

Revision ID: 20260402_140000
Revises: 20260322_120000
Create Date: 2026-04-02

"""
from alembic import op
import sqlalchemy as sa


revision = "20260402_140000"
down_revision = "20260322_120000"
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
    if not column_exists("users", "avatar_url"):
        op.add_column("users", sa.Column("avatar_url", sa.Text(), nullable=True))

    if not column_exists("spots", "pending_revision"):
        op.add_column(
            "spots",
            sa.Column("pending_revision", sa.JSON(), nullable=True),
        )

    if not column_exists("spots", "has_pending_revision"):
        op.add_column(
            "spots",
            sa.Column(
                "has_pending_revision",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            ),
        )


def downgrade() -> None:
    if column_exists("spots", "has_pending_revision"):
        op.drop_column("spots", "has_pending_revision")
    if column_exists("spots", "pending_revision"):
        op.drop_column("spots", "pending_revision")
    if column_exists("users", "avatar_url"):
        op.drop_column("users", "avatar_url")
