"""Video Transcript Learning Material Adapter — Phase 9 (Architecture Ready).

Ingests timestamped lecture transcripts (VTT, SRT, JSON, TXT) from iGOT/NSSTA recorded lectures
without requiring heavy multimedia processing libraries.
"""
from __future__ import annotations

import json
import re
from typing import Any, Dict, Optional
from .base import BaseLearningMaterialAdapter, IngestedDocumentResult


class VideoTranscriptAdapter(BaseLearningMaterialAdapter):
    """Parses timestamped video lecture transcripts (VTT, SRT, JSON transcripts)."""

    SUPPORTED_EXTENSIONS = {".vtt", ".srt", ".transcript"}

    def supports_extension(self, filename: str) -> bool:
        ext = ("." + filename.rsplit(".", 1)[-1]).lower() if "." in filename else ""
        return ext in self.SUPPORTED_EXTENSIONS or "transcript" in filename.lower()

    def extract_text_and_metadata(
        self, file_bytes: bytes, filename: str, metadata: Optional[Dict[str, Any]] = None
    ) -> IngestedDocumentResult:
        try:
            raw_text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            raw_text = file_bytes.decode("latin-1", errors="replace")

        # Strip VTT / SRT timestamps and cue numbers if standard subtitle format
        lines = raw_text.splitlines()
        cleaned_lines = []
        timestamps = []

        timestamp_pattern = re.compile(r"(\d{1,2}:\d{2}(?::\d{2})?(?:\.\d{3})?)\s*-->\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\.\d{3})?)")

        for line in lines:
            line_str = line.strip()
            if not line_str or line_str.isdigit() or line_str.startswith("WEBVTT"):
                continue
            if timestamp_pattern.search(line_str):
                m = timestamp_pattern.search(line_str)
                if m:
                    timestamps.append(m.group(1))
                continue
            cleaned_lines.append(line_str)

        cleaned_text = "\n".join(cleaned_lines).strip()
        if not cleaned_text:
            cleaned_text = raw_text.strip()

        title = filename.rsplit(".", 1)[0].replace("_", " ").title()
        word_count = len(cleaned_text.split())
        est_mins = max(1, round(word_count / 150))  # Standard speaking rate ~150 wpm

        meta = metadata.copy() if metadata else {}
        meta.update({
            "is_video_transcript": True,
            "timestamps_count": len(timestamps),
            "filename": filename,
            "architecture_mode": "Transcript-Based Video Ingestion Ready",
        })

        return IngestedDocumentResult(
            title=f"{title} (Lecture Transcript)",
            content_text=cleaned_text,
            format_type="application/x-subrip" if filename.endswith(".srt") else "text/vtt",
            estimated_reading_minutes=est_mins,
            metadata=meta,
            is_transcript=True,
            language=meta.get("language", "en"),
        )
