"""spot English translation columns for admin pending flow

Revision ID: 20260402_160000
Revises: 20260402_140000
Create Date: 2026-04-02

"""
from alembic import op
import sqlalchemy as sa


revision = "20260402_160000"
down_revision = "20260402_140000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("spots", sa.Column("title_en", sa.Text(), nullable=True))
    op.add_column("spots", sa.Column("description_en", sa.Text(), nullable=True))
    op.add_column("spots", sa.Column("subtitle_en", sa.Text(), nullable=True))
    op.add_column("spots", sa.Column("how_to_get_there_en", sa.Text(), nullable=True))
    op.add_column("spots", sa.Column("location_name_en", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("spots", "location_name_en")
    op.drop_column("spots", "how_to_get_there_en")
    op.drop_column("spots", "subtitle_en")
    op.drop_column("spots", "description_en")
    op.drop_column("spots", "title_en")
