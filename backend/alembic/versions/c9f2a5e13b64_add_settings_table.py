"""add settings table

Revision ID: c9f2a5e13b64
Revises: b3d81c4f9a27
Create Date: 2026-07-17 13:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'c9f2a5e13b64'
down_revision: Union[str, None] = 'b3d81c4f9a27'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # event_status already exists from the initial migration; without
    # create_type=False this CREATE TABLE tries to define it a second time and
    # the migration dies on "type event_status already exists".
    event_status = postgresql.ENUM(
        'open', 'closed', 'cancelled', name='event_status', create_type=False
    )
    op.create_table(
        'settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('default_category', sa.String(length=50), server_default='General', nullable=False),
        sa.Column('default_event_status', event_status, server_default='open', nullable=False),
        sa.Column('max_featured', sa.Integer(), server_default='5', nullable=False),
        sa.Column('show_featured_marquee', sa.Boolean(), server_default='true', nullable=False),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint('id'),
        # Belt and braces: the app only ever reads/writes id=1, and this stops a
        # second row from ever making "the settings" ambiguous.
        sa.CheckConstraint('id = 1', name='ck_settings_singleton'),
    )
    # Seed the singleton so a fresh install has settings to read.
    op.execute('INSERT INTO settings (id) VALUES (1)')


def downgrade() -> None:
    op.drop_table('settings')
