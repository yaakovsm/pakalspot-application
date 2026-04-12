"""contact_submissions table for public contact form

Revision ID: 20260412_120000
Revises: 20260402_160000
Create Date: 2026-04-12

"""
from alembic import op
import sqlalchemy as sa


revision = "20260412_120000"
down_revision = "20260402_160000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "contact_submissions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("issue", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("contact_submissions")
