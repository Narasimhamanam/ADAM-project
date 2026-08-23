"""
Embedding & Semantic Similarity Engine
======================================
Provides vector embedding representations and cosine similarity calculation
for PubMed scientific abstracts and literature queries.
"""
from __future__ import annotations

import re
import math
from typing import List, Dict, Any, Tuple
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


class SemanticSearchEngine:
    """TF-IDF and Cosine Similarity semantic index over literature documents."""

    def __init__(self):
        self.vectorizer = TfidfVectorizer(
            stop_words="english",
            ngram_range=(1, 2),
            max_features=5000,
            sublinear_tf=True,
        )
        self.documents: List[Dict[str, Any]] = []
        self.doc_matrix: Optional[np.ndarray] = None
        self.is_fitted = False

    def index_documents(self, docs: List[Dict[str, Any]]) -> None:
        """Fit and transform corpus of research documents."""
        self.documents = docs
        corpus = [
            f"{d.get('title', '')} {d.get('abstract', '')} {d.get('keywords', '')}"
            for d in docs
        ]
        if corpus:
            self.doc_matrix = self.vectorizer.fit_transform(corpus)
            self.is_fitted = True

    def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Compute cosine similarity between query and indexed articles."""
        if not self.is_fitted or not self.documents:
            return []

        query_vec = self.vectorizer.transform([query])
        similarities = cosine_similarity(query_vec, self.doc_matrix).flatten()
        
        # Rank by similarity score descending
        top_indices = np.argsort(similarities)[::-1][:top_k]

        results = []
        for idx in top_indices:
            score = float(similarities[idx])
            doc = self.documents[idx].copy()
            doc["similarity_score"] = round(score, 4)
            results.append(doc)

        return results
