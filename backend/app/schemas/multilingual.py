"""Pydantic schemas for Multilingual Learning Architecture — Phase 9.

Supports extensible localization data models for official Indian languages:
  - English (en) [Default]
  - Hindi (hi)
  - Bengali (bn), Telugu (te), Marathi (mr), Tamil (ta), Gujarati (gu), Kannada (kn)
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class LocalizedField(BaseModel):
    """Field localized across multiple languages."""
    default: str
    translations: Dict[str, str] = Field(default_factory=dict)


class LocalizedContentItem(BaseModel):
    """Localized content snippet for an official language."""

    language_code: str = Field(..., description="ISO 639-1 language code (e.g. en, hi)")
    language_name: str = Field(..., description="Display language name (e.g. Hindi, English)")
    title: str
    description: Optional[str] = None
    content: str
    explanation: Optional[str] = None


class MultilingualContentMetadata(BaseModel):
    """Metadata detailing multilingual content translations and quality tiers."""

    content_id: str
    default_language: str = "en"
    supported_languages: List[str] = Field(default_factory=lambda: ["en", "hi"])
    title_translations: Dict[str, str] = Field(default_factory=dict)
    translation_quality: Dict[str, str] = Field(default_factory=dict)


class MultilingualResourceResponse(BaseModel):
    """Resource response with multilingual readiness metadata."""

    resource_id: str
    default_language: str = "en"
    available_languages: List[str] = Field(default_factory=lambda: ["en", "hi"])
    translations: Dict[str, LocalizedContentItem] = Field(default_factory=dict)
    architecture_status: str = "Multilingual Architecture Ready"
    disclaimer: str = (
        "Statistical frameworks and primary documentation are authored in English and Hindi (Rajbhasha). "
        "Additional regional languages utilize localized metadata schema."
    )
