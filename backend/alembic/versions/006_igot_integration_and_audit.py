"""iGOT Integration Provenance and External Reference Schema

Revision ID: 006_igot_integration_and_audit
Revises: 005_verification_and_retention
Create Date: 2026-09-08 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '006_igot_integration_and_audit'
down_revision: Union[str, None] = '005_verification_and_retention'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add source_system and external_reference_id to competency_evidences
    op.add_column(
        'competency_evidences',
        sa.Column('source_system', sa.String(length=50), server_default='manual', nullable=False)
    )
    op.add_column(
        'competency_evidences',
        sa.Column('external_reference_id', sa.String(length=128), nullable=True)
    )
    op.create_index(
        'ix_competency_evidences_external_reference_id',
        'competency_evidences',
        ['external_reference_id']
    )
    op.create_index(
        'ix_competency_evidences_officer_source_ext',
        'competency_evidences',
        ['officer_profile_id', 'source_system', 'external_reference_id']
    )


def downgrade() -> None:
    op.drop_index('ix_competency_evidences_officer_source_ext', table_name='competency_evidences')
    op.drop_index('ix_competency_evidences_external_reference_id', table_name='competency_evidences')
    op.drop_column('competency_evidences', 'external_reference_id')
    op.drop_column('competency_evidences', 'source_system')
