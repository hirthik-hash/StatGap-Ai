"""User and OfficerProfile database repository."""
from typing import Optional
from sqlalchemy.orm import Session, joinedload
from backend.app.models.user import User
from backend.app.models.officer_profile import OfficerProfile
from backend.app.schemas.auth import UserRegister
from backend.app.schemas.officer import OfficerProfileUpdate


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: int) -> Optional[User]:
        return (
            self.db.query(User)
            .options(joinedload(User.profile))
            .filter(User.id == user_id)
            .first()
        )

    def get_by_igot_id(self, igot_id: str) -> Optional[User]:
        return (
            self.db.query(User)
            .options(joinedload(User.profile))
            .filter(User.igot_id == igot_id.strip().upper())
            .first()
        )

    def get_by_email(self, email: str) -> Optional[User]:
        return (
            self.db.query(User)
            .options(joinedload(User.profile))
            .filter(User.email == email.strip().lower())
            .first()
        )

    def create_user_with_profile(self, data: UserRegister, password_hash: str) -> User:
        role = (data.role or "OFFICER").strip().upper()
        user = User(
            igot_id=data.iGotId.strip().upper(),
            email=data.email.strip().lower(),
            password_hash=password_hash,
            role=role,
            is_active=True,
        )
        self.db.add(user)
        self.db.flush()  # Populates user.id

        profile = OfficerProfile(
            user_id=user.id,
            name=data.name.strip(),
            phone=data.phone.strip(),
            dob=data.dob.strip(),
            department=data.department.strip(),
            designation=data.designation.strip(),
            years_of_experience=data.yearsOfExperience,
            profile_photo=data.profilePhoto,
            cadre=(data.cadre or "ISS").strip().upper(),
            current_assignment="",
            qualifications="",
        )
        self.db.add(profile)
        self.db.commit()
        self.db.refresh(user)
        return user

    def update_profile(self, user: User, data: OfficerProfileUpdate) -> OfficerProfile:
        profile = user.profile
        if not profile:
            # Create if missing
            profile = OfficerProfile(
                user_id=user.id,
                name=user.igot_id,
                phone="",
                dob="",
                department="",
                designation="",
                years_of_experience=0,
            )
            self.db.add(profile)

        update_dict = data.model_dump(exclude_unset=True)
        for key, val in update_dict.items():
            if val is not None:
                # Map camelCase to snake_case if necessary
                attr_name = {
                    "yearsOfExperience": "years_of_experience",
                    "profilePhoto": "profile_photo",
                    "currentAssignment": "current_assignment",
                }.get(key, key)
                setattr(profile, attr_name, val)

        self.db.commit()
        self.db.refresh(profile)
        self.db.refresh(user)
        return profile
