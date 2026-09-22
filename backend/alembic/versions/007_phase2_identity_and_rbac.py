"""Phase 2: User Role, Officer Cadre & Assignment, and Security Audit Schema

Revision ID: 007_phase2_identity_and_rbac
Revises: 006_igot_integration_and_audit
Create Date: 2026-09-16 19:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '007_phase2_identity_and_rbac'
down_revision: Union[str, None] = '006_igot_integration_and_audit'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add role column to users
    op.add_column(
        'users',
        sa.Column('role', sa.String(length=32), server_default='OFFICER', nullable=False)
    )
    op.create_index('ix_users_role', 'users', ['role'])

    # 2. Add cadre, current_assignment, qualifications to officer_profiles
    op.add_column(
        'officer_profiles',
        sa.Column('cadre', sa.String(length=64), server_default='ISS', nullable=True)
    )
    op.add_column(
        'officer_profiles',
        sa.Column('current_assignment', sa.String(length=255), nullable=True)
    )
    op.add_column(
        'officer_profiles',
        sa.Column('qualifications', sa.Text(), nullable=True)
    )

    # 3. Alter competency_audit_events to allow system/auth events without an officer_profile
    op.alter_column('competency_audit_events', 'officer_id', existing_type=sa.Integer(), nullable=True)
    op.add_column(
        'competency_audit_events',
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=True)
    )
    op.create_index('ix_competency_audit_events_user_id', 'competency_audit_events', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_competency_audit_events_user_id', table_name='competency_audit_events')
    op.drop_column('competency_audit_events', 'user_id')
    op.alter_column('competency_audit_events', 'officer_id', existing_type=sa.Integer(), nullable=False)

    op.drop_column('officer_profiles', 'qualifications')
    op.drop_column('officer_profiles', 'current_assignment')
    op.drop_column('officer_profiles', 'cadre')

    op.drop_index('ix_users_role', table_name='users')
    op.drop_column('users', 'role')
