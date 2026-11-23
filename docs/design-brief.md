# ADAM-1 Enhanced Workspace Design Brief

## Executive Summary & Visual Identity

The ADAM-1 Enhanced research platform implements a modern **Liquid Glass** aesthetic over an obsidian / deep teal backdrop. Clinical and scientific tabular records retain an opaque, high-contrast reading surface to preserve data readability and comply with WCAG AA accessibility standards. 

The application architecture stratifies visual planes into distinct depth tiers:
1. **Base Mesh Canvas (z: 0)**: Ambient radial depth mesh providing subtle luminance.
2. **Reading / Data Surface (z: 1)**: High-opacity cards for clinical tables, confusion matrices, and ROC/PR curves.
3. **Glass Translucent Chrome (z: 10–20)**: Layered navigation (sidebar, header, breadcrumbs) utilizing multi-layer specular highlights and soft edge refractions.
4. **AIRA Assistant Dialog & Floating Avatar (z: 30–50)**: Floating atop work sessions with high-opacity backing to ensure no underlying text bleeds through.

All scientific metrics and validation blocks (internal AUROC 0.778, AlzBiom external AUROC 0.561, "no detectable transfer", and the species-plus-clinical unvalidated notice) are strictly immutable and carried through directly.

---

## Color Tokens & Design System

The system operates across dual themes (Light Clinical Teal & Dark Obsidian Cyan) with verified WCAG AA contrast (≥ 4.5:1 for body copy, ≥ 3.0:1 for large headers and interactive icons).

| Token Name | Light Theme | Dark Theme | Purpose & Role |
|:---|:---|:---|:---|
| `--glass-base` | `#ffffff` (opaque) | `#172631` (opaque) | High-contrast card backing |
| `--glass-panel` | `rgba(255, 255, 255, 0.85)` | `rgba(23, 38, 49, 0.88)` | Translucent glass surface fill |
| `--glass-text` | `#172d37` | `#eef6f5` | Primary body typography (contrast > 9:1) |
| `--glass-muted` | `#435d65` | `#b5cbd0` | Secondary metadata and helper labels |
| `--glass-tint` | `#075f63` | `#87e3dc` | Primary interactive brand accent |
| `--glass-edge` | `rgba(166, 193, 194, 0.65)` | `rgba(73, 99, 106, 0.65)` | 1px border specular edge |
| `--glass-inner-highlight` | `inset 0 1px 0 rgba(255,255,255,0.4)` | `inset 0 1px 0 rgba(255,255,255,0.08)` | Refraction top-edge highlight |
| `--glass-mesh` | `#e5f2ee` | `#163237` | Ambient background radial glow |
| `--surface-950` | `248 250 252` (`#F8FAFC`) | `9 13 22` (`#090d16`) | Root canvas application background |

---

## Typography & Scale

Single cohesive type scale anchored to system sans-serif (`Inter`, `system-ui`) and tabular monospace (`JetBrains Mono`, `Consolas`) for numerical matrices:

| Level | Size / Line-Height | Tracking | Usage |
|:---|:---|:---|:---|
| **Display Title (H1)** | `clamp(22px, 2.2vw, 28px)` / `1.25` | `-0.025em` | Page and section titles |
| **Section Header (H2)** | `18px` / `1.35` | `-0.015em` | Card titles, modal titles |
| **Subheader (H3)** | `15px` / `1.4` | `-0.01em` | Group headers, table headers |
| **Body (Regular)** | `14px` / `1.5` | `normal` | General clinical copy and paragraphs |
| **Caption / Helper** | `12px` / `1.4` | `+0.01em` | Metadata, badge labels, timestamps |
| **Micro / Subtext** | `10px` / `1.3` | `+0.04em` | All-caps navigation category labels |
| **Data / Tabular** | `13px` / `1.4` | `-0.02em` | Numerical values, IDs, SHAP values (`font-mono`) |

---

## Glass Specification Recipes

### Translucency & Elevation Tiers
- **Tier 1 (Surface Cards)**: Opaque fill `--glass-base`, 1px solid `--glass-edge`, shadow `0 1px 3px rgba(0,0,0,0.05)`.
- **Tier 2 (Glass Navigation)**: Fill `color-mix(in srgb, var(--glass-base) 90%, transparent)`, `backdrop-filter: blur(12px) saturate(115%)`, 1px solid `--glass-edge`, inner highlight `inset 0 1px 0 rgba(255,255,255,0.15)`.
- **Tier 3 (Floating Modals & AIRA Dialog)**: Fill `color-mix(in srgb, var(--glass-base) 94%, transparent)`, `backdrop-filter: blur(16px) saturate(120%)`, shadow `0 12px 32px rgba(0,0,0,0.25)`, high-opacity backing prevents text bleed-through.

### Buttons & Interactive Controls
- **Primary Action**: Brand tint background, visible focus ring (`3px solid var(--glass-tint)`, `outline-offset: 2px`), active press down-scale `translateY(1px)`.
- **Secondary / Ghost**: Glass base fill, 1px border `--glass-edge`, subtle hover tint.
- **Icon Buttons**: Minimum touch target `40px x 40px` on mobile/tablet devices.

---

## Mobile Geometry & Responsive Standards (360px, 390px, 768px, 1440px)

1. **Header Layout**:
   - Title uses fluid clamping (`clamp(15px, 4vw, 20px)`) to prevent line wrapping on 360px widths.
   - Theme toggle, system badge, and settings shortcut are neatly grouped with `shrink-0` to avoid clipping.
2. **Floating AIRA Button**:
   - Narrow screens (`< 640px`): Collapses to an icon-only circular pill (`w-11 h-11`), fixed at `bottom-4 right-4`.
   - Content padding: Workspace content includes `pb-20` on mobile to guarantee no data cards are obscured.
3. **Assistant Dialog Overlay**:
   - Mobile: Slides into a full-height or docked 94vw drawer with strict focus trapping and Escape-key dismiss.

---

## 3D AIRA Avatar Specification

- **Architecture**: WebGL single-pass custom fragment shader rendered into an HTML5 canvas (`44x44` px baseline, scaled by `min(devicePixelRatio, 1.5)`).
- **Asset Size**: `< 5 KB` total code overhead (0 external textures or 3D geometry files).
- **State Machine**:
  - `idle`: Gentle organic breathing (sinusoidal pulse).
  - `listening`: Core tilts toward input, luminescence intensifies (+18%).
  - `thinking`: Rotating orbital rings and accelerated frequency core oscillation.
  - `answering`: Dynamic wave pulse synchronized to streaming chunk tokens.
  - `error`: Desaturated hue (-45% luminance) with horizontal oscillation (shake).
  - `greeting`: Two-cycle rotation wave on initial session arrival.
- **Fallbacks & Safety**:
  - Fallback to vector `OrbIcon` SVG if WebGL context is lost or unsupported.
  - Automatically suspends rendering loop (`clearInterval`) when `document.hidden` is true or under `@media (prefers-reduced-motion: reduce)`.
