"""Officer profile schemas for updates and retrieval."""
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class OfficerProfileUpdate(BaseModel):
    """
    Editable profile fields for authenticated officers.
    Does NOT allow modifying user ID, iGot ID, email, or credentials.
    """
    name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    phone: Optional[str] = Field(default=None, min_length=7, max_length=32)
    dob: Optional[str] = Field(default=None, max_length=32)
    department: Optional[str] = Field(default=None, min_length=2, max_length=255)
    designation: Optional[str] = Field(default=None, min_length=2, max_length=255)
    yearsOfExperience: Optional[int] = Field(default=None, ge=0, le=60)
    profilePhoto: Optional[str] = Field(default=None)
    cadre: Optional[str] = Field(default=None, max_length=64)
    currentAssignment: Optional[str] = Field(default=None, max_length=255)
    qualifications: Optional[str] = Field(default=None, max_length=512)

    model_config = ConfigDict(populate_by_name=True)

