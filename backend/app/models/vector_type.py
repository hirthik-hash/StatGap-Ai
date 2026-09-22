"""Dialect-aware Vector type supporting PostgreSQL pgvector and SQLite test environments."""
import json
from typing import List, Optional, Any
from sqlalchemy.types import TypeDecorator, Text
from pgvector.sqlalchemy import Vector as PGVector


class VectorType(TypeDecorator):
    """
    SQLAlchemy TypeDecorator that delegates to pgvector.sqlalchemy.Vector on PostgreSQL,
    and falls back to JSON-serialized Text on SQLite/other dialects.
    """
    impl = Text
    cache_ok = True

    def __init__(self, dim: int = 768, *args: Any, **kwargs: Any):
        super().__init__(*args, **kwargs)
        self.dim = dim
        self.pg_vector = PGVector(dim)

    def load_dialect_impl(self, dialect: Any) -> Any:
        if dialect.name == "postgresql":
            return dialect.type_descriptor(self.pg_vector)
        return dialect.type_descriptor(Text())

    def process_bind_param(self, value: Optional[List[float]], dialect: Any) -> Any:
        if value is None:
            return None
        if dialect.name == "postgresql":
            return value
        return json.dumps(value)

    def process_result_value(self, value: Any, dialect: Any) -> Optional[List[float]]:
        if value is None:
            return None
        if dialect.name == "postgresql":
            if isinstance(value, list):
                return value
            if hasattr(value, "tolist"):
                return value.tolist()
            return list(value)
        if isinstance(value, str):
            return json.loads(value)
        return value
