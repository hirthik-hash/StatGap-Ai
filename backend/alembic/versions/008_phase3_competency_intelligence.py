"""Phase 3: Competency Intelligence Layer Schema

Revision ID: 008_phase3_competency_intelligence
Revises: 007_phase2_identity_and_rbac
Create Date: 2026-09-16 20:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '008_phase3_competency_intel'
down_revision: Union[str, None] = '007_phase2_identity_and_rbac'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None



def upgrade() -> None:
    # 1. Extend competency_nodes with ontology metadata and hierarchy fields
    op.add_column('competency_nodes', sa.Column('code', sa.String(length=64), nullable=True))
    op.create_index('ix_competency_nodes_code', 'competency_nodes', ['code'])
    op.add_column('competency_nodes', sa.Column('ontology_level', sa.String(length=32), server_default='competency', nullable=False))
    op.add_column('competency_nodes', sa.Column('domain', sa.String(length=64), server_default='statistical', nullable=False))
    op.add_column('competency_nodes', sa.Column('required_proficiency', sa.Float(), server_default='0.75', nullable=False))
    op.add_column('competency_nodes', sa.Column('version', sa.String(length=32), server_default='1.0.0', nullable=False))
    op.add_column('competency_nodes', sa.Column('parent_id', sa.String(length=64), sa.ForeignKey('competency_nodes.id', ondelete='SET NULL'), nullable=True))
    op.create_index('ix_competency_nodes_parent_id', 'competency_nodes', ['parent_id'])

    # Update valid_relationship_type_check constraint on competency_relationships
    op.drop_constraint('valid_relationship_type_check', 'competency_relationships', type_='check')
    op.create_check_constraint(
        'valid_relationship_type_check',
        'competency_relationships',
        "relationship_type IN ('prerequisite', 'depends_on', 'related_to', 'applied_in', 'part_of', 'commonly_confused_with', 'parent_of', 'requires', 'PREREQUISITE', 'DEPENDS_ON', 'RELATED_TO', 'PARENT_OF', 'REQUIRES', 'PART_OF')"
    )

    # 2. Create competency_requirements table

    op.create_table(
        'competency_requirements',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('competency_id', sa.String(length=64), nullable=False),
        sa.Column('cadre', sa.String(length=64), nullable=True),
        sa.Column('function_name', sa.String(length=255), nullable=True),
        sa.Column('current_assignment', sa.String(length=255), nullable=True),
        sa.Column('designation', sa.String(length=255), nullable=True),
        sa.Column('role', sa.String(length=32), nullable=True),
        sa.Column('required_level', sa.Float(), server_default='0.75', nullable=False),
        sa.Column('priority', sa.Integer(), server_default='1', nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint(
            'competency_id', 'cadre', 'function_name', 'current_assignment', 'designation', 'role',
            name='uq_competency_requirement_scope'
        )
    )
    op.create_index('ix_competency_requirements_id', 'competency_requirements', ['id'])
    op.create_index('ix_competency_requirements_competency_id', 'competency_requirements', ['competency_id'])
    op.create_index('ix_competency_requirements_cadre', 'competency_requirements', ['cadre'])
    op.create_index('ix_competency_requirements_function_name', 'competency_requirements', ['function_name'])
    op.create_index('ix_competency_requirements_current_assignment', 'competency_requirements', ['current_assignment'])
    op.create_index('ix_competency_requirements_designation', 'competency_requirements', ['designation'])
    op.create_index('ix_competency_requirements_role', 'competency_requirements', ['role'])

    # 3. Create officer_competency_states table
    op.create_table(
        'officer_competency_states',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('officer_profile_id', sa.Integer(), sa.ForeignKey('officer_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('competency_id', sa.String(length=64), sa.ForeignKey('competencies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('current_level', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('required_level', sa.Float(), server_default='0.75', nullable=False),
        sa.Column('gap', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('raw_gap', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('status', sa.String(length=32), server_default='competent', nullable=False),
        sa.Column('gap_band', sa.String(length=16), server_default='green', nullable=False),
        sa.Column('confidence', sa.Float(), server_default='0.5', nullable=False),
        sa.Column('confidence_category', sa.String(length=32), server_default='MODERATE_CONFIDENCE', nullable=False),
        sa.Column('confidence_reason', sa.String(length=255), nullable=True),
        sa.Column('evidence_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('last_evidence_at', sa.DateTime(), nullable=True),
        sa.Column('evidence_sources', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('officer_profile_id', 'competency_id', name='uq_officer_competency_state')
    )
    op.create_index('ix_officer_competency_states_id', 'officer_competency_states', ['id'])
    op.create_index('ix_officer_competency_states_officer_profile_id', 'officer_competency_states', ['officer_profile_id'])
    op.create_index('ix_officer_competency_states_competency_id', 'officer_competency_states', ['competency_id'])

    # 4. Create structured_evidence table
    op.create_table(
        'structured_evidence',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('officer_profile_id', sa.Integer(), sa.ForeignKey('officer_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('competency_id', sa.String(length=64), sa.ForeignKey('competencies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('sub_skill_id', sa.String(length=64), nullable=True),
        sa.Column('source_type', sa.String(length=32), nullable=False),
        sa.Column('source_reference', sa.String(length=128), nullable=True),
        sa.Column('raw_score', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('normalized_score', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('weight', sa.Float(), server_default='1.0', nullable=False),
        sa.Column('validity_status', sa.String(length=32), server_default='VALID', nullable=False),
        sa.Column('evidence_metadata', sa.Text(), nullable=True),
        sa.Column('recorded_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_structured_evidence_id', 'structured_evidence', ['id'])
    op.create_index('ix_structured_evidence_officer_profile_id', 'structured_evidence', ['officer_profile_id'])
    op.create_index('ix_structured_evidence_competency_id', 'structured_evidence', ['competency_id'])
    op.create_index('ix_structured_evidence_sub_skill_id', 'structured_evidence', ['sub_skill_id'])
    op.create_index('ix_structured_evidence_source_type', 'structured_evidence', ['source_type'])
    op.create_index('ix_structured_evidence_source_reference', 'structured_evidence', ['source_reference'])

    # 5. Create digital_twin_snapshots table
    op.create_table(
        'digital_twin_snapshots',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('officer_profile_id', sa.Integer(), sa.ForeignKey('officer_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('snapshot_id', sa.String(length=64), nullable=False),
        sa.Column('trigger_event', sa.String(length=64), server_default='MANUAL_SNAPSHOT', nullable=False),
        sa.Column('identity_context', sa.Text(), nullable=False),
        sa.Column('competency_state_json', sa.Text(), nullable=False),
        sa.Column('graph_context_json', sa.Text(), nullable=False),
        sa.Column('learning_context_json', sa.Text(), nullable=False),
        sa.Column('ontology_version', sa.String(length=32), server_default='1.0.0', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('snapshot_id')
    )
    op.create_index('ix_digital_twin_snapshots_id', 'digital_twin_snapshots', ['id'])
    op.create_index('ix_digital_twin_snapshots_officer_profile_id', 'digital_twin_snapshots', ['officer_profile_id'])
    op.create_index('ix_digital_twin_snapshots_snapshot_id', 'digital_twin_snapshots', ['snapshot_id'])


def downgrade() -> None:
    op.drop_table('digital_twin_snapshots')
    op.drop_table('structured_evidence')
    op.drop_table('officer_competency_states')
    op.drop_table('competency_requirements')

    op.drop_index('ix_competency_nodes_parent_id', table_name='competency_nodes')
    op.drop_column('competency_nodes', 'parent_id')
    op.drop_column('competency_nodes', 'version')
    op.drop_column('competency_nodes', 'required_proficiency')
    op.drop_column('competency_nodes', 'domain')
    op.drop_column('competency_nodes', 'ontology_level')
    op.drop_index('ix_competency_nodes_code', table_name='competency_nodes')
    op.drop_column('competency_nodes', 'code')
