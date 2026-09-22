"""Plaintext and Markdown learning material parser."""
from __future__ import annotations

import re
from typing import Any, Dict, Optional
from .base import BaseLearningMaterialAdapter, IngestedDocumentResult


class TextMaterialAdapter(BaseLearningMaterialAdapter):
    """Parses .txt and .md statistical learning materials."""

    SUPPORTED_EXTENSIONS = {".txt", ".md", ".markdown"}

    def supports_extension(self, filename: str) -> bool:
        ext = ("." + filename.rsplit(".", 1)[-1]).lower() if "." in filename else ""
        return ext in self.SUPPORTED_EXTENSIONS

    def extract_text_and_metadata(
        self, file_bytes: bytes, filename: str, metadata: Optional[Dict[str, Any]] = None
    ) -> IngestedDocumentResult:
        try:
            text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            text = file_bytes.decode("latin-1", errors="replace")

        # Clean text
        text = text.strip()
        title = filename.rsplit(".", 1)[0].replace("_", " ").title()

        # Check for markdown title # Title
        first_line = text.split("\n", 1)[0].strip()
        if first_line.startswith("# "):
            title = first_line[2:].strip()

        word_count = len(text.split())
        est_mins = max(1, round(word_count / 180))

        meta = metadata.copy() if metadata else {}
        meta.update({
            "word_count": word_count,
            "filename": filename,
            "encoding": "utf-8",
        })

        return IngestedDocumentResult(
            title=title,
            content_text=text,
            format_type="text/markdown" if filename.endswith(".md") else "text/plain",
            estimated_reading_minutes=est_mins,
            metadata=meta,
            is_transcript=False,
            language=meta.get("language", "en"),
        )
