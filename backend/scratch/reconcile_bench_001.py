import pandas as pd
import numpy as np
import json
import hashlib
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier
from sklearn.metrics import (
    accuracy_score, balanced_accuracy_score, confusion_matrix,
    recall_score, precision_score, f1_score, roc_auc_score, brier_score_loss
)

csv_path = 'e:/ADAM-Enhanced/backend/data/global_resources/clinical_microbiome_df.csv'
with open(csv_path, 'rb') as f:
    sha256_hash = hashlib.sha256(f.read()).hexdigest()

df = pd.read_csv(csv_path)
print(f"Dataset SHA-256: {sha256_hash}")
print(f"Total Rows: {len(df)}, Total Cols: {len(df.columns)}")
print("Sample-level diagnosis counts:")
print(df['Alzheimers'].value_counts())

# Group by subject
subject_df = df.groupby('study_id').agg(
    alzheimers=('Alzheimers', 'first'),
    sample_count=('Sample ID', 'count'),
    sample_ids=('Sample ID', list)
).reset_index()

print("\nSubject-level diagnosis counts:")
print(subject_df['alzheimers'].value_counts())

# Subject-level train/test split with random_state=42, test_size=0.2
train_subj, test_subj = train_test_split(
    subject_df,
    test_size=0.2,
    stratify=subject_df['alzheimers'],
    random_state=42
)

train_subj_ids = set(train_subj['study_id'])
test_subj_ids = set(test_subj['study_id'])

print(f"\nTrain subjects: {len(train_subj_ids)} (AD: {(train_subj['alzheimers']==1).sum()}, Control: {(train_subj['alzheimers']==0).sum()})")
print(f"Test subjects: {len(test_subj_ids)} (AD: {(test_subj['alzheimers']==1).sum()}, Control: {(test_subj['alzheimers']==0).sum()})")

train_df = df[df['study_id'].isin(train_subj_ids)].copy()
test_df_all = df[df['study_id'].isin(test_subj_ids)].copy()

print(f"\nAll Train Samples: {len(train_df)}")
print(f"All Held-Out Test Samples: {len(test_df_all)} across {len(test_subj_ids)} subjects")
print("Held-out test samples diagnosis count:")
print(test_df_all['Alzheimers'].value_counts())

# How were the 30 balanced test samples selected?
ad_test_samples = test_df_all[test_df_all['Alzheimers'] == 1.0]
ctrl_test_samples = test_df_all[test_df_all['Alzheimers'] == 0.0]
print(f"Test AD samples: {len(ad_test_samples)}, Test Control samples: {len(ctrl_test_samples)}")

# Check random_state 42 sample of 15 each
ad_sampled = ad_test_samples.sample(n=15, random_state=42)
ctrl_sampled = ctrl_test_samples.sample(n=15, random_state=42)
balanced_test_df = pd.concat([ad_sampled, ctrl_sampled]).sample(frac=1.0, random_state=42)

evaluated_test_sample_ids = set(balanced_test_df['Sample ID'])
reserved_test_sample_ids = set(test_df_all['Sample ID']) - evaluated_test_sample_ids

print(f"\nEvaluated Balanced Test Samples: {len(evaluated_test_sample_ids)}")
print(f"Reserved (Unused in balanced evaluation) Test Samples: {len(reserved_test_sample_ids)}")
print(f"Check total sum: {len(train_df)} + {len(evaluated_test_sample_ids)} + {len(reserved_test_sample_ids)} = {len(train_df) + len(evaluated_test_sample_ids) + len(reserved_test_sample_ids)}")

# Prepare features and train XGBoost
meta_cols = ['Sample ID', 'study_id', 'Alzheimers', 'Date Sample', 'age', 'Dementia Other']
feat_cols = [c for c in df.columns if c not in meta_cols and np.issubdtype(df[c].dtype, np.number)]
print(f"\nFeatures used: {len(feat_cols)}")

X_train = train_df[feat_cols]
y_train = train_df['Alzheimers'].astype(int)

# Balanced test set
X_test_bal = balanced_test_df[feat_cols]
y_test_bal = balanced_test_df['Alzheimers'].astype(int)

# Complete all-samples test set
X_test_all = test_df_all[feat_cols]
y_test_all = test_df_all['Alzheimers'].astype(int)

model = XGBClassifier(
    n_estimators=100,
    max_depth=3,
    learning_rate=0.05,
    eval_metric='logloss',
    random_state=42
)
model.fit(X_train, y_train)

# Evaluate on balanced test set (30 samples)
probs_bal = model.predict_proba(X_test_bal)[:, 1]
preds_bal = (probs_bal >= 0.5).astype(int)

acc_bal = accuracy_score(y_test_bal, preds_bal)
b_acc_bal = balanced_accuracy_score(y_test_bal, preds_bal)
sens_bal = recall_score(y_test_bal, preds_bal)
cm_bal = confusion_matrix(y_test_bal, preds_bal)
spec_bal = cm_bal[0, 0] / (cm_bal[0, 0] + cm_bal[0, 1])
prec_bal = precision_score(y_test_bal, preds_bal)
f1_bal = f1_score(y_test_bal, preds_bal)
auc_bal = roc_auc_score(y_test_bal, probs_bal)
brier_bal = brier_score_loss(y_test_bal, probs_bal)

print(f"\n--- Balanced Test (30 samples) Results ---")
print(f"Accuracy: {acc_bal:.4f}")
print(f"Balanced Accuracy: {b_acc_bal:.4f}")
print(f"Sensitivity: {sens_bal:.4f}")
print(f"Specificity: {spec_bal:.4f}")
print(f"Precision: {prec_bal:.4f}")
print(f"F1: {f1_bal:.4f}")
print(f"AUC: {auc_bal:.4f}")
print(f"Brier: {brier_bal:.4f}")
print(f"Confusion Matrix: {cm_bal.tolist()}")

# Also evaluate on ALL 67 held-out test samples across the 21 test subjects
probs_all = model.predict_proba(X_test_all)[:, 1]
preds_all = (probs_all >= 0.5).astype(int)

acc_all = accuracy_score(y_test_all, preds_all)
b_acc_all = balanced_accuracy_score(y_test_all, preds_all)
sens_all = recall_score(y_test_all, preds_all)
cm_all = confusion_matrix(y_test_all, preds_all)
spec_all = cm_all[0, 0] / (cm_all[0, 0] + cm_all[0, 1])
prec_all = precision_score(y_test_all, preds_all)
f1_all = f1_score(y_test_all, preds_all)
auc_all = roc_auc_score(y_test_all, probs_all)
brier_all = brier_score_loss(y_test_all, probs_all)

print(f"\n--- All Held-Out Test Samples (67 samples across 21 subjects) Results ---")
print(f"Accuracy: {acc_all:.4f}")
print(f"Balanced Accuracy: {b_acc_all:.4f}")
print(f"Sensitivity: {sens_all:.4f}")
print(f"Specificity: {spec_all:.4f}")
print(f"Precision: {prec_all:.4f}")
print(f"F1: {f1_all:.4f}")
print(f"AUC: {auc_all:.4f}")
print(f"Brier: {brier_all:.4f}")
print(f"Confusion Matrix: {cm_all.tolist()}")
