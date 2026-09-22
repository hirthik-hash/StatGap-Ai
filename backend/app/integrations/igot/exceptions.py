"""Custom exceptions for iGOT Karmayogi integration boundary."""

class IGOTIntegrationError(Exception):
    """Base exception for all iGOT integration operations."""
    pass


class IGOTNotConfiguredError(IGOTIntegrationError):
    """Raised when real iGOT integration is requested but authorized configuration is absent.
    
    CRITICAL: The system must NEVER silently fallback to mock mode when this occurs.
    """
    pass


class IGOTSyncError(IGOTIntegrationError):
    """Raised when an error occurs during bidirectional synchronization with iGOT."""
    pass


class IGOTIdempotencyError(IGOTIntegrationError):
    """Raised when an idempotency violation occurs during learning evidence ingestion."""
    pass
