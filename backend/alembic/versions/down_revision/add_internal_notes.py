"""Add internal_notes table

Revision ID: add_internal_notes
Revises: <UPDATE_WITH_YOUR_LATEST_REVISION>
Create Date: 2024-12-30

To use this migration:
1. Update 'down_revision' below with your latest migration revision ID
2. Copy this file to backend/alembic/versions/
3. Run: alembic upgrade head
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers - UPDATE down_revision!
revision = 'add_internal_notes'
down_revision = None  # <-- UPDATE THIS to your latest migration revision
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create internal_notes table
    op.create_table(
        'internal_notes',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            'conversation_id', 
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('conversations.id', ondelete='CASCADE'),
            nullable=False
        ),
        sa.Column(
            'author_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('users.id', ondelete='CASCADE'),
            nullable=False
        ),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column(
            'mentions',
            postgresql.ARRAY(postgresql.UUID(as_uuid=True)),
            server_default='{}'
        ),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False
        ),
    )
    
    # Create indexes
    op.create_index(
        'ix_internal_notes_conversation',
        'internal_notes',
        ['conversation_id']
    )
    op.create_index(
        'ix_internal_notes_author',
        'internal_notes',
        ['author_id']
    )


def downgrade() -> None:
    op.drop_index('ix_internal_notes_author', table_name='internal_notes')
    op.drop_index('ix_internal_notes_conversation', table_name='internal_notes')
    op.drop_table('internal_notes')