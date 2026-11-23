# Website audit, 23 November 2026

| Page | Root cause | Change |
|---|---|---|
| Reports | Updating the input recreated the loading callback and retriggered the FB100 mount request. Report components and exports also supplied example values. | Use the URL sample ID, cancel obsolete requests, verify returned IDs, and render a smaller dossier from returned measurements. Print to PDF remains available. |
| Studio | Top-level workflow lookups missed nested computational and summarization results. The UI substituted 50% probability and 85% confidence. The chart received the wrong prop. | Default to ADAM, identify the underlying ML probability separately from the workflow decision, use returned contributions and citations, and export the run response. |
| AIRA | The assistant route redirected to Studio. The unused welcome screen contained static citations. | Restore the page and floating search panel. Render indexed study summaries with returned PubMed identifiers. |
| Research | Dataset details and benchmark tables repeated catalog values. Imaging appeared in two workspaces. | Collapse external resources, use registry links and terms, remove imaging tabs, and read performance from the saved rigor report. |
| Integrity | The linkage view displayed narrative status claims. | Compute local sample collisions, missing cells, subject label consistency and negative abundance counts when opening the panel. Cross-cohort linkage remains unverified. |
| Digital twin | Failed requests could leave the previous participant's data visible. No neighbor list was rendered. | Reset detail state and guard overlapping requests. Rank other subjects on baseline age, frailty and malnutrition. Link matches to their first visit. |
| Dashboard | Static summary counts and benchmark fallback values survived failed requests. | Derive displayed counts from API responses, add record search, and share the validation panel with Reports and Benchmarks. |

## Verification

156 backend tests passed in the offline ASGI harness. Frontend lint, Vite production build and trajectory integration checks passed. Local Chrome and Edge both exited before an automation connection was established. The new browser CI job exercises record switching, Studio default, AIRA citations and the integrity panel. Browser success and line coverage remain unverified locally.

## Research limitations

The frozen genus-level model showed no detectable transfer to AlzBiom. The species-plus-clinical model and conformal prediction sets lack independent validation. Clinical neighbor scores describe baseline resemblance and have no validated prognostic interpretation. AIRA displays indexed research summaries. Its clinical question-answering accuracy has not been established.
