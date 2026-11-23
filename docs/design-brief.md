# ADAM workspace design brief

The workspace uses a quiet blue-green glass surface over a stationary mesh. Clinical and scientific tables retain an opaque reading surface. Navigation occupies one plane, the patient record another, and the assistant dialog sits above both. Existing research outputs and validation wording are carried through directly.

| Token | Light | Dark |
|---|---|---|
| Canvas | #eff5f4 | #0c1720 |
| Reading surface | #ffffff | #172631 |
| Text | #172d37 | #eef6f5 |
| Secondary text | #435d65 | #b5cbd0 |
| Interactive accent | #075f63 | #87e3dc |
| Focus outline | #007479 | #8fe9e3 |

Use the existing sans-serif family, a system monospace for identifiers and a 12/14/16/20/26 px hierarchy. Space related controls by 8 px and sections by 16–24 px. Cards use 16 px corners, controls 10 px and chips pill corners. Use 1 px borders, one inner top highlight, a small contact shadow and one diffuse floating shadow. Limit backdrop blur to navigation and the open assistant (12 px blur, 115% saturation). Cards use tinted solid fills and borders.

Buttons show a visible focus outline, 1 px press movement and a persistent label during loading. Inputs and native selects have solid surfaces. Tabs and toggles expose selected state to assistive technology. Tables use aligned numeric columns and horizontal scroll on small screens. Charts retain labels and high-opacity plotting surfaces. Dialogs use native focus containment, Escape and focus restoration. Long reports print on white, with section headings and page numbers.

The assistant uses an original orbital core with paired helix rings. Its static vector is the baseline. Load a small animated renderer only on interaction; prefer no continuous hidden animation. Reduced transparency uses solid fills. Reduced motion disables movement. Budget: avatar below 300 KB, no third-party font requests, one open modal, and no animated blur. Track measured browser timings separately from these targets.

Build the navigation shell, record finder, shared assistant conversation, avatar, evidence answer cards, report download controls, and print renderer. Preserve existing React, FastAPI and Tailwind conventions.
