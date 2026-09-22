"""CLI Script to ingest official statistical curriculum documents into pgvector database."""
import os
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from backend.app.core.database import SessionLocal
from backend.app.ingestion.ingestion_service import DocumentIngestionService
from backend.app.services.embedding_service import get_embedding_provider


def ingest_sample_documents():
    db = SessionLocal()
    try:
        service = DocumentIngestionService(db, get_embedding_provider())
        data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "sample_documents")

        if not os.path.exists(data_dir):
            print(f"Sample documents directory does not exist: {data_dir}")
            return

        print("Ingesting official statistical curriculum manuals...")
        docs = [
            {
                "file": "nssta_sampling_and_estimation_manual.md",
                "title": "NSSTA Survey Sampling Designs and Estimation Principles",
                "authority": "NSSTA / MoSPI",
                "competency_ids": ["comp_survey_method", "comp_prob_sampling"],
                "description": "Probability sampling, sampling distributions, standard error vs standard deviation, Horvitz-Thompson weights.",
            },
            {
                "file": "nssta_regression_and_inference_guide.md",
                "title": "NSSTA Statistical Inference, Linear Modeling, and Hypothesis Testing",
                "authority": "NSSTA / MoSPI",
                "competency_ids": ["comp_stat_analysis", "comp_prob_sampling"],
                "description": "OLS regression slope vs percentage elasticity, frequentist p-values, confidence interval coverage, statistical significance.",
            },
            {
                "file": "nssta_data_cleaning_and_validation.md",
                "title": "NSSTA Survey Data Cleaning, Outlier Detection, and Imputation",
                "authority": "NSSTA / MoSPI",
                "competency_ids": ["comp_data_cleaning", "comp_data_gov"],
                "description": "Mahalanobis distance, multivariate outlier detection, mean imputation pitfalls, variance preservation.",
            },
        ]

        for doc_info in docs:
            file_path = os.path.join(data_dir, doc_info["file"])
            if os.path.exists(file_path):
                doc = service.ingest_file(
                    file_path=file_path,
                    title=doc_info["title"],
                    authority=doc_info["authority"],
                    competency_ids=doc_info["competency_ids"],
                    description=doc_info["description"],
                )
                print(f"   Indexed: [{doc.id}] {doc.title} ({len(doc.chunks)} chunks)")
            else:
                print(f"   Skipping (not found): {file_path}")

        print("\nDocument ingestion completed successfully.")
    except Exception as e:
        print(f"Ingestion error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    ingest_sample_documents()
