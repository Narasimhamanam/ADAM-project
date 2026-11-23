"""Hybrid retrieval over the curated corpus using BM25 and latent semantic vectors."""
from __future__ import annotations

from collections import Counter

import numpy as np
from sklearn.decomposition import TruncatedSVD
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


class SemanticSearchEngine:
    """Fit corpus-local embeddings; rerank candidates using exact phrase matches."""

    def __init__(self):
        self.vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2),
                                          max_features=5000, sublinear_tf=True)
        self.documents = []
        self.doc_matrix = None
        self.is_fitted = False

    def index_documents(self, docs):
        self.documents = list(docs)
        self.is_fitted = bool(docs)
        if not docs:
            return
        texts = [" ".join(str(d.get(k, "")) for k in ("title", "authors", "abstract", "keywords"))
                 for d in docs]
        self.doc_matrix = self.vectorizer.fit_transform(texts)
        self.analyze = self.vectorizer.build_analyzer()
        self.counts = [Counter(self.analyze(text)) for text in texts]
        self.lengths = np.array([sum(counts.values()) for counts in self.counts])
        dimensions = min(64, len(docs) - 1, self.doc_matrix.shape[1] - 1)
        self.encoder = TruncatedSVD(dimensions, random_state=42) if dimensions > 0 else None
        self.embeddings = self.encoder.fit_transform(self.doc_matrix) if self.encoder else self.doc_matrix

    def search(self, query, top_k=5, min_threshold=0.05):
        if not self.is_fitted:
            return []
        terms = set(self.analyze(query))
        bm25 = np.zeros(len(self.documents))
        for term in terms:
            frequency = np.array([counts[term] for counts in self.counts])
            frequency_docs = np.count_nonzero(frequency)
            if frequency_docs:
                inverse = np.log1p((len(frequency) - frequency_docs + 0.5) / (frequency_docs + 0.5))
                norm = 1.2 * (0.25 + 0.75 * self.lengths / self.lengths.mean())
                bm25 += inverse * frequency * 2.2 / (frequency + norm)
        if not bm25.any():
            return []
        vector = self.vectorizer.transform([query])
        embedding = self.encoder.transform(vector) if self.encoder else vector
        semantic = cosine_similarity(embedding, self.embeddings)[0]
        lexical = cosine_similarity(vector, self.doc_matrix)[0]
        fused = 0.5 * bm25 / bm25.max() + 0.5 * semantic.clip(0, 1)
        candidates = [i for i in np.argsort(-fused) if lexical[i] >= min_threshold][:max(10, top_k)]
        phrases = {term for term in terms if " " in term}
        ranked = []
        for i in candidates:
            phrase_score = sum(term in self.counts[i] for term in phrases) / max(1, len(phrases))
            ranked.append((0.8 * fused[i] + 0.2 * phrase_score, i))
        return [dict(self.documents[i], similarity_score=round(float(score), 4))
                for score, i in sorted(ranked, reverse=True)[:top_k]]
