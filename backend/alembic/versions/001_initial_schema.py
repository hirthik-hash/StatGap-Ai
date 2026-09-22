"""Initial STAT-GAP AI PostgreSQL Schema: users, officer_profiles, competencies, competency_evidences.

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-09-08 19:55:00
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('igot_id', sa.String(length=64), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_igot_id'), 'users', ['igot_id'], unique=True)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # 2. officer_profiles table
    op.create_table(
        'officer_profiles',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('phone', sa.String(length=32), nullable=False),
        sa.Column('dob', sa.String(length=32), nullable=False),
        sa.Column('department', sa.String(length=255), nullable=False),
        sa.Column('designation', sa.String(length=255), nullable=False),
        sa.Column('years_of_experience', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('profile_photo', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_officer_profiles_id'), 'officer_profiles', ['id'], unique=False)
    op.create_index(op.f('ix_officer_profiles_user_id'), 'officer_profiles', ['user_id'], unique=True)

    # 3. competencies table
    op.create_table(
        'competencies',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('category', sa.String(length=255), nullable=False),
        sa.Column('score', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('required_score', sa.Integer(), nullable=False, server_default=sa.text('75')),
        sa.Column('gap_points', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('status', sa.String(length=32), nullable=False, server_default=sa.text("'competent'")),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_competencies_id'), 'competencies', ['id'], unique=False)

    # 4. competency_evidences table
    op.create_table(
        'competency_evidences',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('officer_profile_id', sa.Integer(), nullable=False),
        sa.Column('competency_id', sa.String(length=64), nullable=False),
        sa.Column('assessment_score', sa.Float(), nullable=False, server_default=sa.text('0.0')),
        sa.Column('quiz_accuracy', sa.Float(), nullable=False, server_default=sa.text('0.0')),
        sa.Column('practical_performance', sa.Float(), nullable=False, server_default=sa.text('0.0')),
        sa.Column('assessment_ratio', sa.String(length=64), nullable=True),
        sa.Column('repeated_errors', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('confidence_pattern', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['officer_profile_id'], ['officer_profiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['competency_id'], ['competencies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_competency_evidences_id'), 'competency_evidences', ['id'], unique=False)
    op.create_index(op.f('ix_competency_evidences_officer_profile_id'), 'competency_evidences', ['officer_profile_id'], unique=False)
    op.create_index(op.f('ix_competency_evidences_competency_id'), 'competency_evidences', ['competency_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_competency_evidences_competency_id'), table_name='competency_evidences')
    op.drop_index(op.f('ix_competency_evidences_officer_profile_id'), table_name='competency_evidences')
    op.drop_index(op.f('ix_competency_evidences_id'), table_name='competency_evidences')
    op.drop_table('competency_evidences')

    op.drop_index(op.f('ix_competencies_id'), table_name='competencies')
    op.drop_table('competencies')

    op.drop_index(op.f('ix_officer_profiles_user_id'), table_name='officer_profiles')
    op.drop_index(op.f('ix_officer_profiles_id'), table_name='officer_profiles')
    op.drop_table('officer_profiles')

    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_index(op.f('ix_users_igot_id'), table_name='users')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_table('users')
