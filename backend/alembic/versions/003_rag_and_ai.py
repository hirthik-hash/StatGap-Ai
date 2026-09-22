"""RAG and AI Misconception Intelligence Schema with pgvector support.

Revision ID: 003_rag_and_ai
Revises: 002_knowledge_graph_and_diagnostics
Create Date: 2026-09-08 20:30:00
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision: str = '003_rag_and_ai'
down_revision: Union[str, None] = '002_knowledge_graph'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Ensure pgvector extension is available in PostgreSQL
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    # 2. knowledge_documents table
    op.create_table(
        'knowledge_documents',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('document_type', sa.String(length=32), nullable=False),
        sa.Column('source', sa.String(length=255), nullable=False),
        sa.Column('source_url', sa.Text(), nullable=True),
        sa.Column('version', sa.String(length=32), nullable=True),
        sa.Column('authority', sa.String(length=255), server_default=sa.text("'NSSTA'"), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('checksum', sa.String(length=64), nullable=False),
        sa.Column('status', sa.String(length=32), server_default=sa.text("'indexed'"), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_knowledge_documents_id'), 'knowledge_documents', ['id'], unique=False)
    op.create_index(op.f('ix_knowledge_documents_checksum'), 'knowledge_documents', ['checksum'], unique=True)

    # 3. knowledge_chunks table with 768-dim Vector column
    op.create_table(
        'knowledge_chunks',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('document_id', sa.String(length=64), nullable=False),
        sa.Column('chunk_index', sa.Integer(), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('page_number', sa.Integer(), nullable=True),
        sa.Column('section_title', sa.String(length=255), nullable=True),
        sa.Column('token_count', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('chunk_metadata', sa.Text(), nullable=True),
        sa.Column('embedding', Vector(768), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['document_id'], ['knowledge_documents.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_knowledge_chunks_id'), 'knowledge_chunks', ['id'], unique=False)
    op.create_index(op.f('ix_knowledge_chunks_document_id'), 'knowledge_chunks', ['document_id'], unique=False)

    # 4. Add AI & RAG audit columns to gap_diagnoses
    op.add_column('gap_diagnoses', sa.Column('ai_analysis', sa.Text(), nullable=True))
    op.add_column('gap_diagnoses', sa.Column('ai_confidence', sa.Float(), nullable=True))
    op.add_column('gap_diagnoses', sa.Column('grounding_status', sa.String(length=32), nullable=True))
    op.add_column('gap_diagnoses', sa.Column('retrieved_sources', sa.Text(), nullable=True))
    op.add_column('gap_diagnoses', sa.Column('llm_model', sa.String(length=64), nullable=True))
    op.add_column('gap_diagnoses', sa.Column('prompt_version', sa.String(length=32), nullable=True))


def downgrade() -> None:
    op.drop_column('gap_diagnoses', 'prompt_version')
    op.drop_column('gap_diagnoses', 'llm_model')
    op.drop_column('gap_diagnoses', 'retrieved_sources')
    op.drop_column('gap_diagnoses', 'grounding_status')
    op.drop_column('gap_diagnoses', 'ai_confidence')
    op.drop_column('gap_diagnoses', 'ai_analysis')

    op.drop_index(op.f('ix_knowledge_chunks_document_id'), table_name='knowledge_chunks')
    op.drop_index(op.f('ix_knowledge_chunks_id'), table_name='knowledge_chunks')
    op.drop_table('knowledge_chunks')

    op.drop_index(op.f('ix_knowledge_documents_checksum'), table_name='knowledge_documents')
    op.drop_index(op.f('ix_knowledge_documents_id'), table_name='knowledge_documents')
    op.drop_table('knowledge_documents')

