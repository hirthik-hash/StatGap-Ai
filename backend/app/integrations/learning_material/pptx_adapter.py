"""PPTX Presentation Material Parser."""
from __future__ import annotations

import io
import zipfile
import xml.etree.ElementTree as ET
from typing import Any, Dict, Optional
from .base import BaseLearningMaterialAdapter, IngestedDocumentResult


class PptxMaterialAdapter(BaseLearningMaterialAdapter):
    """Parses Microsoft PowerPoint (.pptx) training slide decks."""

    SUPPORTED_EXTENSIONS = {".pptx"}

    def supports_extension(self, filename: str) -> bool:
        ext = ("." + filename.rsplit(".", 1)[-1]).lower() if "." in filename else ""
        return ext in self.SUPPORTED_EXTENSIONS

    def extract_text_and_metadata(
        self, file_bytes: bytes, filename: str, metadata: Optional[Dict[str, Any]] = None
    ) -> IngestedDocumentResult:
        slide_texts = []
        slide_count = 0
        try:
            with zipfile.ZipFile(io.BytesIO(file_bytes)) as pptx_zip:
                # Find all slide files: ppt/slides/slide1.xml, slide2.xml ...
                slide_files = sorted(
                    [f for f in pptx_zip.namelist() if f.startswith("ppt/slides/slide") and f.endswith(".xml")]
                )
                slide_count = len(slide_files)
                namespaces = {"a": "http://schemas.openxmlformats.org/drawingml/2006/main"}
                for s_file in slide_files:
                    xml_content = pptx_zip.read(s_file)
                    tree = ET.fromstring(xml_content)
                    texts = [node.text for node in tree.iterfind(".//a:t", namespaces) if node.text]
                    if texts:
                        slide_texts.append(" ".join(texts))
        except Exception:
            # Fallback for plain/mock pptx data
            try:
                raw = file_bytes.decode("utf-8", errors="ignore").strip()
                if raw:
                    slide_texts.append(raw)
            except Exception:
                slide_texts.append(f"Presentation slides from {filename}")

        extracted_text = "\n\n--- Slide Break ---\n\n".join(slide_texts).strip()
        if not extracted_text:
            extracted_text = f"Slide deck content from {filename} ({slide_count} slides)"

        title = filename.rsplit(".", 1)[0].replace("_", " ").title()
        word_count = len(extracted_text.split())
        est_mins = max(1, round(word_count / 180))

        meta = metadata.copy() if metadata else {}
        meta.update({
            "slide_count": slide_count,
            "word_count": word_count,
            "filename": filename,
            "parser": "pptx_xml_extractor",
        })

        return IngestedDocumentResult(
            title=title,
            content_text=extracted_text,
            format_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            estimated_reading_minutes=est_mins,
            metadata=meta,
            is_transcript=False,
            language=meta.get("language", "en"),
        )
