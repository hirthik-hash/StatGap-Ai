# STAT-GAP AI — Grounded RAG & Document Processing Architecture

## 1. Statutory Document Pipeline Overview

STAT-GAP AI processes official curriculum, procedural manuals, national standards, and instructional slide decks to power its grounded explanation and assessment generation engines.

```mermaid
flowchart TD
    Upload["1. Document Upload\n(PDF / DOCX / PPTX / MD)"]
    Validate["2. Validation & Security Scan\n(MIME type, size <= 20MB, file signature)"]
    Extract["3. Document Parsing & Structure Extraction\n(PyMuPDF, python-docx, python-pptx)"]
    Classify["4. Access Control & Authority Tagging\n(MoSPI, NSSTA, CSO, Public vs Internal)"]
    Chunk["5. Hierarchical Chunking\n(400-800 tokens with section/page preservation)"]
    Embed["6. Vector Embedding Generation\n(768-dim text-embedding-004)"]
    Store[("7. Vector Persistence\n(PostgreSQL pgvector)")]

    Upload --> Validate --> Extract --> Classify --> Chunk --> Embed --> Store
```

---

## 2. Ingestion & Document Parsers

| Document Type | Parser Engine | Extraction Strategy | Metadata Captured |
|:---|:---|:---|:---|
| **PDF Documents** | `pypdf` / `PyMuPDF` | Clean text extraction, table layout preservation, heading hierarchy detection. | Page number, section header, document title, issuing division. |
| **Word Documents** | `python-docx` | Structured paragraph parsing, table cell extraction, style hierarchy (Heading 1, 2, 3). | Heading path, table index, author, revision date. |
| **PowerPoint Decks** | `python-pptx` | Slide-by-slide text box extraction, speaker notes extraction, bullet hierarchy. | Slide number, slide title, presentation theme. |
| **Markdown / Text** | Python native | Header splitting (`#`, `##`, `###`), list item preservation. | Section path, anchor slug. |

### Chunking Strategy
- **Target Size**: $500$ tokens ($\approx 2,000$ characters) with an overlap of $100$ tokens.
- **Context Injection**: Every chunk is prefixed with its document provenance:
  ```text
  [DOCUMENT: NSSTA Regression and Inference Guide | SECTION: 4.2 Residual Diagnostics | AUTHORITY: NSSTA/MoSPI]
  ```
- **Vector Representation**: 768-dimensional floating point vector generated via Google `text-embedding-004` (with offline fallback mock for automated CI testing).

---

## 3. Retrieval & The 3-Tier Grounding Gate

The system enforces a **strict mathematical grounding gate** prior to invoking generative LLMs. Generative models are **never permitted to answer freely from pre-trained parametric memory** for official statistical guidance.

```mermaid
flowchart TD
    Query["Incoming Diagnostic or MCQ Query"]
    VectorSearch["pgvector Cosine Distance Query\n(1 - (embedding <=> query_vector))"]
    FilteredChunks["Authorized Chunks Filtered by Authority & Competency"]
    BestScore{"Evaluate Highest Similarity Score\nS_max"}

    Query --> VectorSearch --> FilteredChunks --> BestScore

    BestScore -->|S_max >= 0.65| Grounded["GROUNDED (Tier 1)\nProceed to LLM generation\nwith explicit source citations"]
    BestScore -->|0.48 <= S_max < 0.65| Weak["WEAK GROUNDING (Tier 2)\nProceed with caution warning\nflag for human review"]
    BestScore -->|S_max < 0.48| Refusal["INSUFFICIENT GROUNDING (Tier 3)\nHARD REFUSAL\nDo not call LLM; return statutory fallback"]
```

### Grounding Thresholds Defined

| Grounding State | Similarity Range ($S_{\max}$) | System Behavior & Anti-Hallucination Defense |
|:---:|:---:|:---|
| **`grounded`** | $\mathbf{S_{\max} \ge 0.65}$ | Sufficient official evidence retrieved. The LLM synthesizes an explanation or MCQ strictly bounded to the supplied text. Source citations are appended to the response. |
| **`weak_grounding`** | $\mathbf{0.48 \le S_{\max} < 0.65}$ | Borderline relevance. System provides the response but flags it prominently with a warning indicator: *"Advisory response based on partial curriculum similarity."* |
| **`insufficient_grounding`** | $\mathbf{S_{\max} < 0.48}$ | **Hard Refusal**. The LLM generation is completely bypassed. The system returns an explicit refusal message to prevent any hallucination of government procedures or statistical formulas. |

---

## 4. Grounded MCQ Generation Pipeline

When generating new diagnostic items or practice questions from authorized manuals:

```mermaid
sequenceDiagram
    participant Admin as Supervisor / Training Admin
    participant RAG as RAG Service
    participant LLM as LLM Generation Service
    participant Val as Question Validator
    participant DB as Assessment Bank (DB)

    Admin->>RAG: Request MCQ generation for "comp_data_cleaning"
    RAG->>RAG: Retrieve verified chunks (S >= 0.65)
    RAG->>LLM: Generate structured MCQ (Stem, 4 Options, Correct Key, Distractor Misconception Tags)
    LLM->>Val: Structured Question JSON Payload
    Val->>Val: Validate Item: Single correct key? Stem length >= 20 chars? All 4 options unique? Distractor tags valid?
    alt Validation Passes
        Val->>DB: Persist with Document Provenance (Doc ID, Page, Section)
        DB-->>Admin: Confirmed Generated Item Ready for Use
    else Validation Fails
        Val-->>Admin: Question Rejected (Failed Validation Audit)
    end
```

### Strict Traceability Contract
Every generated MCQ record in the database must persist:
1. `document_id`: Foreign key to `knowledge_documents`.
2. `chunk_id`: Foreign key to the specific `knowledge_chunks` row.
3. `page_number`: Exact page in the source PDF.
4. `source_citation`: Human-readable citation (e.g., *"MoSPI Sampling Manual, Vol II, p. 84"*).
5. `distractor_misconception_map`: JSON mapping which distractor corresponds to which fallacy from the Misconception Library.
