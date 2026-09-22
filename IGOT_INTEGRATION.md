# STAT-GAP AI — iGOT Karmayogi Integration Architecture & Contract Specification

## 1. Architectural Principles & Isolation Boundary

STAT-GAP AI is an independent competency intelligence engine designed for civil service statistical officers. To maintain strict modularity and prevent vendor lock-in, the STAT-GAP intelligence core **does NOT depend directly on iGOT Karmayogi**.

### Integration Flow:
```text
iGOT Karmayogi (External System)
              ↓
    IGOTIntegrationService (Application Integration Boundary)
              ↓
          IGOTAdapter (Abstract Interface Contract)
              ↓
  Normalized Internal STAT-GAP Evidence Payload
              ↓
      CompetencyEvidence (Internal Storage & Provenance)
              ↓
    STAT-GAP Intelligence Core (KG, Gap Diagnosis, IRT, Decay Engine)
```

The STAT-GAP core operates purely on normalized internal `CompetencyEvidence` records. This ensures that alternative or future training platforms (e.g., state administrative academies, internal MoSPI LMS portals) can feed the platform without altering the diagnostic engine.

---

## 2. Pluggable Adapter Contract (`IGOTAdapter`)

All integration interactions are defined by the abstract base class `IGOTAdapter` (`backend/app/integrations/igot/igot_adapter.py`):

```python
class IGOTAdapter(ABC):
    @abstractmethod
    def fetch_officer_learning_records(self, officer_igot_id: str) -> List[IGOTLearningRecord]:
        """Retrieves raw course completions and assessment records."""
        ...

    @abstractmethod
    def fetch_course_completion(self, course_id: str, officer_igot_id: str) -> Optional[IGOTCourseCompletion]:
        """Retrieves specific course completion status and score."""
        ...

    @abstractmethod
    def publish_competency_verification(self, export_payload: IGOTCompetencyExport) -> IGOTSyncResult:
        """Publishes verified competency certification event back to iGOT."""
        ...

    @abstractmethod
    def publish_learning_status(self, officer_igot_id: str, competency_id: str, status: str) -> IGOTSyncResult:
        """Publishes learning progression or remedial recommendation state."""
        ...
```

---

## 3. Mock Adapter vs. Real Adapter Replacement Protocol

### 3.1 MockIGOTAdapter (Prototype / Demo / CI Baseline)
- **Role**: Provides realistic civil service training history for demonstration and automated testing.
- **Data Ingestion**: Pre-seeded with representative statistical courses:
  - *National Accounts Compilation & SNA 2008*
  - *Sample Survey Design & Multi-Stage Sampling*
  - *Index Numbers: Consumer Price Index (CPI) & IIP*
  - *Official Data Governance & National Data Protection*
- **Behaviors**:
  - Deterministic score generation.
  - Idempotent record ingestion: subsequent syncs detect existing `(officer_profile_id, source_system, external_reference_id)` and skip duplication.

### 3.2 RealIGOTAdapter (Future Production Boundary)
- **Status**: Non-functional placeholder boundary.
- **Strict Constraint**: Do NOT assume or invent OAuth2, mTLS, or proprietary token handshake protocols until official, authorized iGOT Karmayogi API specifications and security keys are formally issued by the National Programme for Civil Services Capacity Building (NPCSCB).
- **Behavior without Configuration**:
  - Mode configured to `IGOT_MODE=authorized` without official credentials raises `IGOTNotConfiguredError` and returns `NOT_CONFIGURED`.
  - **Never silently falls back to Mock-iGOT** in authorized mode.
  - Verification export attempts under unconfigured authorized mode return `status: "not_configured"`.

### 3.3 Seamless Future Replacement
To transition to the live iGOT API:
1. Implement the concrete HTTP/gRPC protocol strictly within `RealIGOTAdapter` to satisfy the `IGOTAdapter` interface.
2. Supply official environment credentials (`IGOT_API_BASE_URL`, `IGOT_CLIENT_ID`, `IGOT_CLIENT_SECRET`).
3. Set `IGOT_MODE=authorized`.
4. Zero code changes are required in `IGOTIntegrationService`, `GapDiagnosisService`, `AdaptiveAssessmentService`, or the frontend presentation layer.

---

## 4. Idempotency & Provenance Guarantees

Every learning record imported from iGOT creates a `CompetencyEvidence` record marked with explicit provenance:
- `source_system`: `"mock_igot"` (or `"real_igot"`).
- `external_reference_id`: Unique external course attempt identifier (e.g., `MOCK-LRN-00123-01`).
- `assessment_ratio`: Indicates external learning record weighting in gap evaluations.

Subsequent imports check database indexes for `(officer_profile_id, source_system, external_reference_id)`. Duplicates are tracked as `skipped_count`, ensuring that re-running imports never artificially skews diagnostic evidence.

---

## 5. Audit Logging & Verification Export

When an officer successfully passes independent verification and re-assessment:
1. `IGOTIntegrationService.export_competency_verification` verifies that `verification_status == "verified"`.
2. The export payload is submitted to `adapter.publish_competency_verification`.
3. An immutable `CompetencyAuditEvent` (`event_type="igot_competency_exported"`) is recorded in PostgreSQL.
4. Attempting to export an unverified or failing competency is strictly rejected with `error_code="NOT_VERIFIED"`.

---

## 6. Official Disclaimer & Claim Discipline

> **STATUTORY DISCLAIMER**:
> The present iGOT Karmayogi integration implemented in STAT-GAP AI operates as a **prototype simulation and architectural boundary**. All course titles, scores, and synchronization handshakes demonstrate system interoperability under statutory constraints. Live synchronization with the national Karmayogi Bharat infrastructure will be enabled upon bilateral institutional provisioning of authorized API endpoints, cryptographic keys, and data-sharing agreements.
