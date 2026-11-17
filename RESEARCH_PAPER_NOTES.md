# Subject-level conformal prediction for longitudinal ADAM-1

## Abstract

ADAM-1 compares binary Alzheimer-associated classifications using clinical and microbiome profiles. We examine the cost of requiring a prediction set to cover all observed visits for a new subject. We combine prevalence-based feature selection with split conformal calibration on subject maxima. In a paired evaluation of 335 visits from 102 subjects, the combined method covered every observed visit for 96 of 102 subjects, compared with 62 of 102 for forced-choice XGBoost. It emitted a single label for 88 of 335 visits. Its input had 200 predictors instead of 1,044, and its forced-choice F1 was 0.533 versus 0.548 for the full model. The experiment is retrospective and internal to one cohort.

## Problem statement and related work

[Huang et al. (2025)](https://doi.org/10.1109/ACCESS.2025.3599857) evaluate ADAM-1 and XGBoost on clinical and microbiome data. The [reference XGBoost notebook](https://github.com/melhzy/ADAM/blob/32d87e359cc050cab74b68fcccbef97172acc00c/base_model_selection/ML_xgboost/machine_learning_experiment01.ipynb) already separates subjects for its outer split. Its binary decisions do not give a simultaneous coverage target across visits. Also, visit-level calibration gives subjects with more visits more influence.

The method applies established split conformal prediction to a whole-subject score. [Angelopoulos and Bates](https://arxiv.org/abs/2107.07511) describe the finite-sample split rule. [Lee, Barber, and Willett](https://arxiv.org/abs/2306.06342) analyze uncertainty under hierarchical sampling. The contribution here is an ADAM-specific systems integration and paired ablation of the accuracy, coverage, and compute trade-offs. Priority for a new conformal algorithm has not been established.

## Proposed methodology

For species $j$, compute prevalence as the fraction of fitting subjects with at least one positive abundance for $j$. Keep the 96 most prevalent species, breaking ties by input-column order, and retain all 104 non-taxonomic predictors used in this benchmark. Match species against the committed taxonomy manifest. Fit XGBoost using only fitting subjects. For class $y$ at visit $v$, define $s(v,y)=1-\hat p(y\mid v)$.

For each calibration subject $i$, compute $S_i=\max_v s(v,y_{iv})$. With $m$ calibration subjects, take the $\lceil(m+1)(1-\alpha)\rceil$-th smallest $S_i$, or use 1 if the rank exceeds $m$. A visit set includes every class with score at most that cutoff. Singleton sets yield an automatic label, while two-label and empty sets abstain. If calibration subjects and a new subject, including their observation processes, are exchangeable conditional on the fitted model, the rank argument bounds marginal simultaneous miscoverage by $\alpha$. This does not guarantee coverage by diagnosis, site, visit count, or individual.

## Experimental setup

The bundled clinical microbiome matrix contains 335 visits from 102 nursing-home subjects. Five randomly assigned subject folds at seed 42 give each subject exactly one test fold. Within each fold, 54 subjects fit the model, 27–28 calibrate, and 20–21 test. Fitting allocations are identical across models. Both XGBoost configurations use the repository defaults and training-only class weights. Calibration uses $\alpha=0.10$. F1, accuracy and AUROC use all visit probabilities, with a 0.5 cutoff for binary metrics. Simultaneous coverage counts subjects for whom every observed visit contains the true label. Singleton error uses the singleton subset as its denominator.

```bash
cd backend
python -m app.research.run_subject_benchmark --output research-benchmark.json
```

The command records fold sizes, cutoffs, software versions, dataset SHA-256 hashes, and aggregate metrics. The runs use bundled CSV files and do not call language model providers. The comparator is the repository's XGBoost model family, with fit allocation matched to the extension, rather than the original paper's full LLM pipeline.

## Quantitative results

| Variant | Predictors | Forced F1 | AUROC | All-visit subject coverage | Singleton visits | Error among singletons | Median fit | Median test batch |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Full XGBoost, forced choice | 1,044 | 0.548 | 0.751 | 60.8% | 100% | 26.6% | 191 ms | 2.56 ms |
| Full, visit-calibrated sets | 1,044 | 0.548 | 0.751 | 84.3% | 54.9% | 15.8% | 191 ms | 2.56 ms |
| Full, subject-calibrated sets | 1,044 | 0.548 | 0.751 | 93.1% | 26.3% | 15.9% | 191 ms | 2.56 ms |
| Compact, forced choice | 200 | 0.533 | 0.752 | 60.8% | 100% | 27.2% | 100 ms | 1.21 ms |
| Compact, subject-calibrated sets | 200 | 0.533 | 0.752 | 94.1% | 26.3% | 11.4% | 100 ms | 1.21 ms |

Windows, Python 3.13.5, XGBoost 2.1.4, NumPy 2.4.4, pandas 2.3.0 and scikit-learn 1.8.0. Times are observed medians across five folds, exclude calibration and set assembly at inference, and can vary with hardware and load. Compact fitting time includes feature selection. The median serialized booster was 104,479 bytes for the full model and 104,986 bytes for the compact model. The dimension reduction does not translate to a smaller serialized booster here. Fold estimates share training subjects, and no inferential comparison or external validation was performed.

## Future work

Freeze the feature budget and test on independent cohorts with documented site, diagnosis, covariate timing, and visit distributions. Audit diagnosis proxies such as medication prescribed after diagnosis. Report coverage and abstention across demographic and clinical subgroups, investigate sensitivity to visit density and compositional preprocessing, and compare with the original LLM pipeline at matched cost and fixed data splits. Clinical diagnosis, future disease conversion, and conference acceptance remain unevaluated.
