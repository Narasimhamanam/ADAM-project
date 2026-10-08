# ADAM-1 Enhanced — Longitudinal AD Risk Trajectory Module

## 1. Executive Summary

This document describes the design, scientific rationale, mathematical formulations, database architecture, API contracts, and user interface for the **Longitudinal AD Risk Trajectory** module in **ADAM-1 Enhanced**.

This module characterizes changes in machine learning model-estimated Alzheimer's Disease (AD)-associated risk across repeated longitudinal metagenomic and clinical observations from the same individual.

---

## 2. Research Integrity & Mandatory Scientific Distinction

### What is IMPLEMENTED:
**Longitudinal AD-Associated Risk Trajectory**
- Patient timelines grouped by true subject identifier (`study_id`).
- Chronological ordering of repeated observations by study day (`day`) and sample collection date (`Date Sample`).
- Tracking of model-estimated AD probability over observed research follow-up.
- Temporal slope calculations (rate of change per day / per 30-day period) where sufficient observations exist.
- Dynamic tracking of Shannon alpha diversity, key taxonomic abundances, clinical frailty metrics, and TreeSHAP attributions across visits.

### What is NOT IMPLEMENTED (and MUST NOT be claimed):
**Future Alzheimer's Disease Onset Prediction / Clinical Prognosis**
- The system **does not** predict the exact future date of Alzheimer's onset.
- The system **does not** provide a guaranteed future clinical diagnosis.
- The system **does not** extrapolate biological trajectories past the last observed sample date.
- The system **never** claims that an individual will develop Alzheimer's disease at an arbitrary future date.

### Scientific Ground Truth of the Dataset:
An empirical audit of all 335 metagenomic cohort samples across all 102 unique subjects (`study_id`) demonstrates that:
```text
Subjects with varying Alzheimers label over time: 0
Total observed Control → AD disease-transition events: 0
```
Every subject in this research cohort is either an established Alzheimer's subject throughout observation or a Cognitive Control throughout observation. **Because there are zero observed transition events (Control → MCI → AD), training a statistically valid time-to-event survival model is scientifically impossible with this dataset.**

Any model claiming to predict the exact date of future disease onset from this dataset would be fabricating predictions. Therefore, the feature is strictly implemented as a **Longitudinal AD-Associated Risk Trajectory across observed research follow-up**.

---

## 3. Paper & Presentation Positioning

When describing this system in publications, research posters, and presentations:

- ❌ **DO NOT WRITE:** *"Our system predicts future Alzheimer's disease."*
- ❌ **DO NOT WRITE:** *"The patient is progressing toward Alzheimer's disease."*
- ❌ **DO NOT WRITE:** *"Predicted Alzheimer's onset date: 2030."*

- ✅ **MANDATORY SCIENTIFIC FORMULATION:**
> *"The enhanced framework incorporates longitudinal analysis to characterize changes in model-estimated AD-associated risk across repeated observations."*

- ✅ **FUTURE EXTENSION FORMULATION:**
> *"A future extension will incorporate longitudinal cohorts containing documented disease transitions and time-to-event information to enable validated survival-based estimation of the probability of AD onset within a specified future horizon."*

---

## 4. Subject Leakage Prevention

### Research Rule:
Subject ≠ Sample. A single subject has up to 12 repeated measurements.
Random sample-level splitting causes **longitudinal subject leakage**, where samples from the same subject appear in both training and test partitions, resulting in artificially inflated performance metrics.

### Implementation:
1. All partitioning is performed strictly at the subject level (`study_id`).
2. Automated leakage detection:
```python
def validate_no_subject_leakage(train_study_ids: List[str], test_study_ids: List[str]) -> None:
    overlap = set(train_study_ids).intersection(set(test_study_ids))
    if overlap:
        raise SubjectLeakageError(f"SUBJECT LEAKAGE DETECTED! Overlapping study_ids: {sorted(list(overlap))}")
```
3. If subject overlap is detected between training and test sets, the pipeline immediately raises `SubjectLeakageError` and aborts rather than continuing.

---

## 5. Mathematical Formulations & Feature Engineering

For each subject $i$ with $N$ chronological observations $t_1, t_2, \dots, t_N$ at study days $d_1 < d_2 < \dots < d_N$:

### 1. Baseline Values
- $P_{\text{base}} = P(t_1)$ (Model AD probability at first observed visit)
- $H'_{\text{base}} = H'(t_1)$ (Shannon diversity at first observed visit)
- $\text{CFS}_{\text{base}} = \text{CFS}(t_1)$ (Clinical Frailty Scale at baseline)

### 2. Latest Values
- $P_{\text{latest}} = P(t_N)$
- $H'_{\text{latest}} = H'(t_N)$
- $\text{CFS}_{\text{latest}} = \text{CFS}(t_N)$

### 3. Absolute & Percentage-Point Change
$$\Delta P = P_{\text{latest}} - P_{\text{base}}$$
$$\Delta P_{\text{pp}} = \Delta P \times 100$$

### 4. Relative Change (Safe Zero-Denominator)
$$\Delta P_{\text{rel}} = \begin{cases} 
\frac{P_{\text{latest}} - P_{\text{base}}}{P_{\text{base}}}, & \text{if } P_{\text{base}} > 10^{-4} \\ 
0.0, & \text{otherwise} 
\end{cases}$$

### 5. Temporal Slope ($\text{Slope}_{\text{day}}$)
When $N \ge 2$ and follow-up duration $(d_N - d_1) > 0$:
$$m = \frac{\sum_{k=1}^N (d_k - \bar{d})(P(t_k) - \bar{P})}{\sum_{k=1}^N (d_k - \bar{d})^2}$$
$$\text{Monthly Slope}_{\text{pp}} = m \times 30 \times 100$$
If $N < 2$ or $(d_N - d_1) = 0$, $m = \text{None}$ and the trajectory is marked as `Insufficient Data`.

### 6. Trajectory Direction Classification
- `Insufficient Data`: $N < 2$ or $(d_N - d_1) = 0$
- `Increasing`: $\Delta P \ge +0.05$ or $m > +0.0005$
- `Decreasing`: $\Delta P \le -0.05$ or $m < -0.0005$
- `Stable`: $|\Delta P| < 0.05$ and $|m| \le 0.0005$

---

## 6. Multi-Signal Trajectory Signals

The module exposes 5 distinct biological and computational signals:
1. **Model AD Probability:** Calibrated probability output from the primary XGBoost classifier (Optuna tuned).
2. **Alpha & Beta Diversity:** Shannon index ($H'$), Simpson index ($D$), Berger-Parker dominance ($d$), and Bray-Curtis dissimilarity relative to the baseline sample.
3. **Key Microbiome Taxa:** Relative abundances of taxa verified in the ADAM paper:
   - *Phocaeicola dorei* (pro-inflammatory marker)
   - *Faecalibacterium prausnitzii* (anti-inflammatory butyrate producer)
   - *Bacteroides uniformis*
   - *Roseburia faecis*
   - *Neglecta timonensis*
   - *Clostridia bacterium*
   - *Alistipes onderdonkii*
   - *Blautia wexlerae*
   - *Catabacter hongkongensis*
   - *Eubacterium rectale*
4. **Clinical Covariates:** Clinical Frailty Scale (CFS 1–9), Malnutrition Indicator Score (0–3), Proton Pump Inhibitor (PPI) use, and antibiotic exposure.
5. **TreeSHAP Biomarker Progression:** Local TreeSHAP attributions computed for every observation, revealing how model decision weights shift across visits.

---

## 7. Trajectory Exploration & Horizon Boundaries

The researcher can select a reference observation and a cutoff time horizon $d_{\text{horizon}}$.
- If $d_{\text{horizon}} \le d_N$: Observations up to $d_{\text{horizon}}$ are rendered.
- If $d_{\text{horizon}} > d_N$: The system **strictly refuses to extrapolate** and displays:
> *"No observed data are available beyond Day {max_day} (date: {latest_date}). Future disease-onset prediction is not currently validated by this dataset."*

---

## 8. Extensible Risk Model Abstraction

The backend implements a 3-tier architectural abstraction:

```text
RiskModelArchitecture
 ├── CurrentClassificationModel (ACTIVE — Cross-sectional XGBoost / RF / LR)
 ├── LongitudinalTrajectoryModel (ACTIVE — Observed empirical risk trajectory)
 └── FutureTimeToEventModel      (NOT_AVAILABLE — Feature flag false)
```

The future time-to-event model requires:
$$\text{Longitudinal Clinical} + \text{Microbiome} + \text{Documented Disease Transitions (Control } \to \text{ MCI } \to \text{ AD)} + \text{Time-to-Event}$$
$$\Downarrow$$
$$P(\text{AD by time } t)$$

Until such transition data are available, `FutureTimeToEventModel` remains cleanly marked as `NOT_AVAILABLE`.

---

## 9. Database Architecture

PostgreSQL table registered in `app.models.dataset`:
```sql
CREATE TABLE subject_trajectory_observations (
    trajectory_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id VARCHAR(100) NOT NULL REFERENCES participants(study_id) ON DELETE CASCADE,
    sample_id VARCHAR(100) NOT NULL REFERENCES clinical_microbiome_samples(sample_id) ON DELETE CASCADE,
    sample_date DATE,
    study_day INTEGER NOT NULL,
    baseline_probability DOUBLE PRECISION NOT NULL,
    current_probability DOUBLE PRECISION NOT NULL,
    probability_change DOUBLE PRECISION NOT NULL,
    probability_slope DOUBLE PRECISION,
    trajectory_direction VARCHAR(50) NOT NULL DEFAULT 'Stable',
    model_version VARCHAR(100) NOT NULL DEFAULT 'xgboost_adam_v1.0',
    feature_schema_version VARCHAR(100) NOT NULL DEFAULT 'adam_v1_1044',
    trajectory_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX ix_subject_trajectory_subject_id ON subject_trajectory_observations(subject_id);
CREATE INDEX ix_subject_trajectory_sample_id ON subject_trajectory_observations(sample_id);
```

---

## 10. API Specification

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/trajectory/subjects` | GET | List all 102 subjects with visit counts, follow-up days, and diagnosis status |
| `/api/trajectory/subjects/{subject_id}` | GET | Get complete longitudinal trajectory with probabilities, SHAP, and slopes |
| `/api/subjects/{subject_id}/trajectory` | GET | Path alias for trajectory retrieval (Section 17 compliance) |
| `/api/subjects/{subject_id}/timeline` | GET | Path alias for chronological observation timeline |
| `/api/trajectory/subjects/{subject_id}/sample/{sample_id}/literature` | GET | Evidence-grounded PubMed RAG retrieval with SHA-256 prompt hash |
| `/api/trajectory/compare` | POST | Side-by-side comparison of multiple subjects |
| `/api/trajectory/evaluation` | GET | Cohort coverage, median follow-up span, and zero-leakage verification |
| `/api/trajectory/capabilities` | GET | Architecture capabilities and time-to-event governance status |

---

## 11. Cohort Coverage & Evaluation Metrics

- **Total Unique Subjects:** 102
- **Total Metagenomic Samples:** 335
- **Subjects with Repeated Samples ($N > 1$):** 75 (73.5% of cohort)
- **Subjects with $N \ge 3$ Samples:** 58 (56.9% of cohort)
- **Median Longitudinal Follow-up:** 60.0 days
- **Maximum Longitudinal Follow-up:** 311.0 days (e.g. subjects followed up to ~10 months)
- **Subject Leakage Checks:** 100% Passed (0 overlapping `study_id` across splits)
- **Observed Disease Transitions:** 0
