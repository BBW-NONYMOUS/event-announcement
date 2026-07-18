"""add events.is_featured

Revision ID: b3d81c4f9a27
Revises: ef40403c2462
Create Date: 2026-07-17 13:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b3d81c4f9a27'
down_revision: Union[str, None] = 'ef40403c2462'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'events',
        sa.Column('is_featured', sa.Boolean(), server_default='false', nullable=False),
    )


def downgrade() -> None:
    op.drop_column('events', 'is_featured')
