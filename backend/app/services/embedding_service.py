"""Embedding Service: Abstract provider, Google Gemini embedding implementation, and offline deterministic mock."""
import hashlib
import math
from abc import ABC, abstractmethod
from typing import List, Optional
from backend.app.core.config import settings


class EmbeddingProvider(ABC):
    @abstractmethod
    def embed_text(self, text: str) -> List[float]:
        """Generates embedding vector for a single text string."""
        pass

    @abstractmethod
    def embed_chunks(self, texts: List[str]) -> List[List[float]]:
        """Generates embedding vectors for a list of text strings."""
        pass

    @property
    @abstractmethod
    def dimension(self) -> int:
        """Returns embedding dimension size."""
        pass


class GeminiEmbeddingProvider(EmbeddingProvider):
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None, dimension: int = 768):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model = model or settings.EMBEDDING_MODEL
        self._dim = dimension

        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not configured for GeminiEmbeddingProvider.")

        from google import genai
        self.client = genai.Client(api_key=self.api_key)

    @property
    def dimension(self) -> int:
        return self._dim

    def embed_text(self, text: str) -> List[float]:
        if not text.strip():
            return [0.0] * self._dim

        res = self.client.models.embed_content(
            model=self.model,
            contents=text,
        )
        if res.embeddings and len(res.embeddings) > 0:
            vec = res.embeddings[0].values
            return list(vec)
        return [0.0] * self._dim

    def embed_chunks(self, texts: List[str]) -> List[List[float]]:
        return [self.embed_text(t) for t in texts]


class MockEmbeddingProvider(EmbeddingProvider):
    """
    Deterministic 768-dimensional normalized embedding generator.
    Encodes statistical keywords and n-grams into specific vector subspaces
    to allow realistic semantic similarity in tests without network calls.
    """
    def __init__(self, dimension: int = 768):
        self._dim = dimension

    @property
    def dimension(self) -> int:
        return self._dim

    def embed_text(self, text: str) -> List[float]:
        if not text.strip():
            return [0.0] * self._dim

        vec = [0.0] * self._dim
        words = text.lower().split()

        # Semantic concept subspace hashing (words and bigrams hash to clustered coordinates)
        clean_words = []
        for w in words:
            w_clean = "".join(c for c in w if c.isalnum())
            if w_clean:
                clean_words.append(w_clean)
                h_w = hashlib.sha256(w_clean.encode("utf-8")).digest()
                # Map word to 8 distinct dimensions
                for k in range(8):
                    idx = (int.from_bytes(h_w[k * 2:(k + 1) * 2], "big")) % self._dim
                    weight = 1.5 if len(w_clean) > 4 else 0.8
                    vec[idx] += weight

        # Also encode bigrams for phrase-level semantic matching
        for i in range(len(clean_words) - 1):
            bigram = f"{clean_words[i]}_{clean_words[i+1]}"
            h_bg = hashlib.sha256(bigram.encode("utf-8")).digest()
            for k in range(4):
                idx = (int.from_bytes(h_bg[k * 2:(k + 1) * 2], "big")) % self._dim
                vec[idx] += 2.0

        # Dense statistical topic signatures for semantic cluster alignment
        topic_clusters = {
            "regression_ols": {"regression", "ols", "slope", "coefficient", "marginal", "elasticity", "beta_1"},
            "hypothesis_testing": {"hypothesis", "pvalue", "pval", "significance", "null", "test"},
            "sampling_estimation": {"sampling", "sample", "survey", "stratified", "cluster", "variance"},
            "confidence_interval": {"confidence", "interval", "coverage", "frequentist", "parameter"},
        }
        for topic_name, keywords in topic_clusters.items():
            matches = sum(1 for kw in keywords if kw in clean_words or any(w.startswith(kw) for w in clean_words))
            if matches > 0:
                h_topic = hashlib.sha512(topic_name.encode("utf-8")).digest()
                topic_weight = min(12.0, 4.0 + matches * 2.5)
                for k in range(32):
                    idx = (int.from_bytes(h_topic[k * 2:(k + 1) * 2], "big")) % self._dim
                    vec[idx] += topic_weight

        # Normalize to unit vector L2 norm = 1.0
        norm = math.sqrt(sum(v * v for v in vec))
        if norm > 0:
            vec = [v / norm for v in vec]
        return vec

    def embed_chunks(self, texts: List[str]) -> List[List[float]]:
        return [self.embed_text(t) for t in texts]


def get_embedding_provider(provider_type: Optional[str] = None) -> EmbeddingProvider:
    """Factory to retrieve configured embedding provider with automatic fallback."""
    provider_name = (provider_type or settings.EMBEDDING_PROVIDER or "gemini").lower()

    if provider_name == "gemini" and settings.GEMINI_API_KEY:
        try:
            return GeminiEmbeddingProvider()
        except Exception:
            # Fall back to mock provider if initialization fails
            return MockEmbeddingProvider(dimension=settings.EMBEDDING_DIMENSION)

    return MockEmbeddingProvider(dimension=settings.EMBEDDING_DIMENSION)
