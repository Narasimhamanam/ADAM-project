# Changelog

## Repository audit and subject-level research benchmark

| Finding | Resolution |
| --- | --- |
| Database startup caught optional extension errors inside a transaction already marked failed. | Use independent savepoints so schema setup can continue. Track startup tasks, cancel them on shutdown, and dispose of the database pool. Performance prewarming is opt-in. |
| Implicit CORS trusted arbitrary Render tenants and the deployment template allowed all origins. | Use explicit allowed origins in the app and Render configuration. |
| Dataset cache initialization was unsynchronized, and split validation could omit missing subject IDs or accept ambiguous labels. | Synchronize default loads and check sample uniqueness, labels, grouping fields, and supported protocols. |
| Prediction caches matched feature counts and experimental training could overwrite the inference artifact. | Share baseline model lookup, fingerprint training matrices, ordered names, seed and parameters, and write artifacts atomically. Train custom API requests without persisting over baseline artifacts. |
| Model and protocol input was loosely constrained before use in filesystem names. | Normalize approved model names, validate protocols, and reject out-of-range split fractions and non-finite custom inputs. |
| Some benchmarks reused a fixed seed's model or derived reference diversity from held-out controls. | Match workflow inference and reference diversity to each benchmark's training subjects. Apply the same rule to the legacy ablation and identify its deterministic consensus proxy. |
| Medication and comorbidity fields were counted as taxa and unrelated dataframes could share a control centroid. | Match columns against the actual 940-species taxonomy and compute each centroid from the supplied reference. |
| Missing labels or single-class outcomes could appear as normal results, and undersized bootstraps received fabricated intervals. | Reject missing prediction ground truth, omit undefined ROC metrics and intervals, and keep binary confusion matrices two-dimensional. |
| The digital twin used known diagnosis, random Shannon values, and fixed uncertainty estimates. | Use subject-held-out XGBoost scores and measured diversity. Return unavailable calibration and interval fields explicitly. |
| External taxonomy audits, imaging observations and portions of the literature index had unsupported values or provenance. | Use the measured local taxonomy, report unavailable external manifests and imaging, and index verified publication summaries. |
| LLM cache keys ignored evidence and writes were neither atomic nor bounded. | Include model inputs and retrieved content in cache keys, isolate historical data, and bound and synchronize runtime cache writes. |
| The research UI read the wrong modality field, and the duplicate reports key disabled linting once ESLint was configured. | Match the API response, retain one reports route definition, add ESLint configuration, and update tests for the consolidated routing. |
| The frontend image build attempted to download a browser during dependency installation. | Skip Puppeteer's optional browser download during Docker and Render builds. |
| The data tests depended on a Windows-only path and silently skipped assertions when it was absent. | Validate the committed cohort files on all platforms, including sample overlap and the full Bray–Curtis matrix. |

The audited baseline is `1f2244b5358df9235d514a9960d444cb314f3535`. The audit inspected the full repository tree and 54 commit summaries, retrieved and verified 301 text blobs, and used the published paper and original XGBoost notebook as methodological references. Nine existing binary assets were inventoried. External cohort ingestion and live model-provider validation require separately available research data and credentials.
