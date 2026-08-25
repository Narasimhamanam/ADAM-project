"""
Pydantic Schemas for Machine Learning & SHAP APIs
=================================================
"""
from __future__ import annotations

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class RocPoint(BaseModel):
    fpr: float
    tpr: float


class ModelMetrics(BaseModel):
    accuracy: float
    auc: float
    f1_score: float
    precision: float
    recall: float
    confusion_matrix: List[List[int]]
    roc_curve: Optional[List[RocPoint]] = None


class TopFeatureImportance(BaseModel):
    feature: str
    importance: float


class ExperimentRecord(BaseModel):
    model: str
    seed: int
    experiment_number: int
    accuracy: float
    auc: float
    f1_score: float


class ModelBenchmark(BaseModel):
    experiment_count: int
    mean_accuracy: float
    std_accuracy: float
    mean_auc: float
    std_auc: float
    mean_f1: float
    std_f1: float
    best_auc: float
    best_f1: float
    experiments: List[ExperimentRecord]


class BenchmarkSummaryResponse(BaseModel):
    total_experiments: int
    models: Dict[str, ModelBenchmark]


class TrainRequest(BaseModel):
    model_name: str = Field(default="xgboost", description="xgboost | randomforest | logisticregression")
    seed: int = Field(default=42, description="Random seed for subject-level split")
    test_size: float = Field(default=0.25, description="Test split fraction (0.1 to 0.4)")
    params: Optional[Dict[str, Any]] = Field(default=None, description="Optional hyperparameter overrides")


class TrainResponse(BaseModel):
    model_id: str
    model_name: str
    seed: int
    metrics: ModelMetrics
    top_features: List[TopFeatureImportance]
    train_samples_count: int
    test_samples_count: int
    feature_count: int


class PredictRequest(BaseModel):
    model_name: Optional[str] = Field(default="xgboost", description="xgboost | randomforest | logisticregression")
    sample_id: Optional[str] = Field(default=None, description="Optional existing Sample ID to score")
    features: Optional[Dict[str, float]] = Field(default=None, description="Custom feature values dictionary")


class FeatureContribution(BaseModel):
    feature: str
    feature_value: float
    shap_value: float
    impact: str


class PredictResponse(BaseModel):
    model_name: str
    sample_id: Optional[str] = None
    alzheimers_risk_probability: float
    predicted_label: int
    risk_level: str
    confidence: float = 0.0
    feature_contributions: List[FeatureContribution]



class ShapFeatureRank(BaseModel):
    rank: int
    feature: str
    mean_abs_shap: float
    mean_shap: float
    std_shap: float
    category: str


class ShapGlobalResponse(BaseModel):
    total_biomarkers: int
    rankings: List[ShapFeatureRank]
