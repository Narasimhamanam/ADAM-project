# ADAM interface changelog

| Page | Change |
| --- | --- |
| Overview | Updated the dashboard layout and surface styling. |
| Patient Explorer | Added record-scoped report and data download controls. |
| Reports & Evidence | Added the shared report download controls. |
| Research Assistant | Added shared conversation state, an orbital avatar, streamed answers, and source details. |
| All pages | Updated the navigation and the floating assistant. Analyze, Research, Rigor, and Settings inherit the shared layout. |

## Verification

The production frontend builds and ESLint passes with zero warnings. The lazy avatar renderer is 2.39 kB before compression. The saved backend run reports 161 passed with one scikit-learn deprecation warning. The executable-line counter recorded 7,273 of 10,890 Python lines (66.79%).

The screenshot inventory contains 32 baseline views, 32 redesigned views, and six avatar states. Browser captures can use replayed API fixtures. They do not establish live backend connectivity.

On the 30 authored known-item questions for the six-document development index, recall at one and three was 1.0 and all 44 retrieved citations matched an indexed identity. This evaluates retrieval and identity. Clinical correctness and generalization require separate evaluation.

Playwright/axe accessibility results, Lighthouse measurements, avatar frame rate, and deployed end-to-end behaviour remain unverified. The npm registry could not be resolved and the required audit packages were unavailable from the local npm cache.
