"""Authentication schemas: Registration, Login, and Safe User Response."""
import re
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Officer's full name")
    iGotId: str = Field(..., min_length=4, max_length=64, description="Official iGOT Karmayogi ID")
    email: str = Field(..., max_length=255, description="Official government email address")
    phone: str = Field(..., min_length=7, max_length=32, description="Contact phone number")
    dob: str = Field(..., max_length=32, description="Date of birth")
    department: str = Field(..., min_length=2, max_length=255, description="Government department/ministry")
    designation: str = Field(..., min_length=2, max_length=255, description="Civil service rank/designation")
    password: str = Field(..., min_length=8, max_length=128, description="Account password")
    yearsOfExperience: int = Field(default=0, ge=0, le=60, description="Years of civil service experience")
    role: Optional[str] = Field(default="OFFICER", description="Civil service system role (OFFICER, SUPERVISOR, ADMIN)")
    cadre: Optional[str] = Field(default="ISS", description="Civil service cadre (e.g. ISS, SSS)")
    profilePhoto: Optional[str] = Field(default=None, description="Profile photo URL")

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        trimmed = v.strip().lower()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", trimmed):
            raise ValueError("Invalid email format")
        return trimmed

    @field_validator("iGotId")
    @classmethod
    def validate_igot_id(cls, v: str) -> str:
        trimmed = v.strip().upper()
        if len(trimmed) < 4:
            raise ValueError("iGOT ID must be at least 4 characters long")
        return trimmed

    model_config = ConfigDict(populate_by_name=True)


class UserLogin(BaseModel):
    iGotId: str = Field(..., description="Official iGOT ID")
    password: str = Field(..., description="Officer password")
    rememberMe: Optional[bool] = Field(default=False, description="Remember login session")

    @field_validator("iGotId")
    @classmethod
    def validate_igot_id(cls, v: str) -> str:
        return v.strip().upper()


class UserResponse(BaseModel):
    """
    Safe public response schema for officer identity.
    NEVER includes password or password_hash.
    """
    id: int
    name: str
    iGotId: str
    email: str
    phone: str
    dob: str
    department: str
    designation: str
    role: str = "OFFICER"
    cadre: Optional[str] = "ISS"
    currentAssignment: Optional[str] = None
    qualifications: Optional[str] = None
    yearsOfExperience: int
    profilePhoto: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
