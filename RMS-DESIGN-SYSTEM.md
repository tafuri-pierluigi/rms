# RMS Design System
*Reference document — v1.0, March 2026*

**Aesthetic:** Crafted · Purposeful · Type-led

---

## Colors

### Base
| Token | Hex | Role |
|-------|-----|------|
| `--bg` | `#F7F5F2` | Page background (warm off-white) |
| `--surface` | `#FFFFFF` | Cards, panels, sidebar |
| `--border` | `#E8E4DF` | Dividers, input borders |
| `--t1` | `#1C1C1E` | Primary text |
| `--t2` | `#6E6E73` | Secondary text |
| `--t3` | `#AEAEB2` | Placeholders, inactive, micro-labels |

### Section Accents
| Token | Hex | Module |
|-------|-----|--------|
| `--cassa` | `#FF6B35` | POS / Cassa |
| `--magazzino` | `#2563EB` | Warehouse |
| `--admin` | `#7C3AED` | Admin |
| `--addons` | `#9CA3AF` | Add-ons (intentionally muted) |

### Semantic
| State | Background | Text |
|-------|-----------|------|
| Success / in-stock | `#ECFDF5` | `#16A34A` |
| Warning / low stock | `#FFF7ED` | `#EA580C` |
| Error / out of stock | `#FEF2F2` | `#DC2626` |

---

## Typography

**Font:** Inter · `-webkit-font-smoothing: antialiased`

| Role | Size | Weight | Letter-spacing |
|------|------|--------|----------------|
| Hero title (section entry) | 56px | 900 | −3px |
| Home card section name | 36px | 900 | −2px |
| Page greeting / h1 | 28px | 900 | −1px |
| KPI / analytics number | 38px | 900 | −2px |
| Stat number | 32px | 900 | −2px |
| Sub-card title | 14px | 700 | — |
| Body / descriptions | 13px | 400 | — |
| Action rows, labels | 13px | 600 | — |
| Sidebar items | 12–13px | 500–700 | — |
| Micro-labels / tags | 10px | 700 | +1.2px, uppercase |

**Rules:** Negative letter-spacing only at ≥28px. Weight 900 reserved for display numbers and section titles. A 3px colored rule always follows a display title.

---

## Spacing & Layout

**Content wrap:** `max-width: 1160px`, `padding: 40px 32px`

**Chrome:**
- Header: fixed, `64px` tall
- Sidebar: fixed, `216px` wide (visible on all non-home pages)
- Content: `padding-top: 64px`; `margin-left: 216px` when sidebar is active

**Grid gaps:** `12px` (action cards, product grid) · `14px` (home cards, KPI row) · `16px` (POS split)

**Home grid logic:**
- 1 section → skip home, go directly to section
- ≤2 sections → 1 row
- 3–7 sections → 2 rows
- 8+ sections → 3 rows

---

## Shadows & Motion

| Token | Value | When |
|-------|-------|------|
| `--sh-sm` | `0 1px 4px rgba(0,0,0,0.07)` | Default resting state |
| `--sh-md` | `0 4px 16px rgba(0,0,0,0.09)` | Hover on action cards |
| `--sh-lg` | `0 8px 32px rgba(0,0,0,0.12)` | Hover on home cards, dropdowns |
| `--tr` | `180ms ease` | All hover transitions |
| Page transition | `fadeUp 200ms ease` | Opacity + translateY 6px→0 |

Elevation increases only on interaction — nothing starts at `--sh-md` or higher.

---

## Border Radius

| Value | Used on |
|-------|---------|
| `20px` | Home cards, section hero, cart panel |
| `16px` | Stat cards, action sub-cards, KPI cards, dropdowns |
| `12px` | Home card CTA button |
| `9999px` | Search input, pills, badges, avatar |
| `8px` | Logo mark, quantity buttons |

---

## Components (key rules)

**Cards (home section):** flex column, content top-to-bottom: micro-label → section name → colored rule → description → spacer → action list → CTA button. Brand stamp top-right corner.

**Action sub-cards:** icon container `42×42px`, `border-radius: 11px`, accent at 8% opacity background. Hover: accent border at 30% opacity.

**Buttons — primary:** accent background, white text, `border-radius: 12px`. Hover: `brightness(0.9)`.

**Buttons — secondary:** `--bg` background, `1.5px` border. Hover: border darkens.

**Status badges:** always paired (background + text). `border-radius: 9999px`, `10px/600`.

**Sidebar:** section headers with colored 8px dot + rotating chevron. Sub-items indented `31px`. Hover: `background: --bg`.

---

## The Diagonal Stamp

The brand signature. Always top-right. Three scales:

| Location | Size | Notes |
|----------|------|-------|
| Logo mark | ~14px CSS trick | 50% opacity |
| Home card | `clamp(58px, 16%, 119px)` | Scales with card width |
| Section hero | ~208px base | Full color + subtle shadow edge |

Appears only at navigation entry points (home cards, section headers). **Not** on functional views (POS, forms, analytics).

---

## Icons

Inline SVG only. Stroke-based (`fill: none`, `stroke-linecap: round`, `stroke-linejoin: round`).
- Default `stroke-width: 2` · CTA arrows/add buttons: `2.5` · Decorative: `1.5`
- Color: `currentColor` by default. White only on colored surfaces (stamps, CTA buttons).

---

## Role-Based Behavior

- Single-section roles bypass the home screen; "Home" is hidden from breadcrumbs.
- Sidebar is absent on the home dashboard, present everywhere else.
- Section accent color follows the user's current section context throughout the page.
