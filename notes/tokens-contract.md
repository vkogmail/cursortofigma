## Tokens Contract Overview

This file documents the stable contracts between:
- Figma variables
- Source design tokens (Tokens Studio export)
- Transformed runtime tokens (CSS variables), which can vary per client

---

## 1. Figma Variables → Logical Token Names

- Figma variables are defined in collections such as:
  - `Brand`
  - `Theme`
  - `Platform`
  - `Scale`
  - `Typography`
  - `Effect`
- Each variable has:
  - `collectionId` (e.g. `VariableCollectionId:116:1174` → `Theme`)
  - `name` (e.g. `color/surface/default`)
  - Optional mode (e.g. `Light`, `Dark`, `High Contrast`)
- **Contract**
  - The **logical token name** is the Figma variable `name` string, e.g.:
    - `color/surface/page`
    - `color/surface/default`
    - `color/border/default`
    - `color/foreground/inverse`
  - Figma variables and source tokens must share these logical names.

---

## 2. Logical Token Names → Source Tokens (Tokens Studio JSON)

- **Source repo**: `vkogmail/exact-tokens`
- **Root for Tokens Studio export**: `tokens/`
  - `$metadata.json`
  - `$themes.json`
  - `Brand/`
  - `Theme/`
  - `Platform/`
  - `Scale/`
  - `Typography/`
  - `Effect/`
- **Theme modes**
  - Theme values for `Light`, `Dark`, `HighContrast` live in:
    - `tokens/Theme/Light.json`
    - `tokens/Theme/Dark.json`
    - `tokens/Theme/HighContrast.json`
- **Contract**
  - For a given logical token name (e.g. `color/surface/default`) and theme mode (e.g. `Light`),
    there must be a corresponding entry in the Tokens Studio JSON under `tokens/`.
  - This JSON is the **single source of truth** for token semantics and base values.
  - Clients may change:
    - Which themes exist
    - Which sets are active
  - But the logical names remain consistent so they stay in sync with Figma variables.

---

## 3. Logical Token Names → Transformed Runtime Tokens (CSS Variables)

- **Transformed tokens root (for this repo)**:
  - `demo/public/tokens/`
    - `tokens-base.css`
    - `tokens-themes.css`
- **Intended roles**
  - `tokens-base.css`
    - Base scales (color ramps, spacing, radii, typography sizes, etc.).
  - `tokens-themes.css`
    - Theme-resolved semantic tokens for modes such as `Light`, `Dark`, `HighContrast`.
- **Contract**
  - At runtime, semantic tokens derived from Figma (e.g. `color/surface/default`) must be
    available as CSS custom properties defined somewhere under the transformed tokens root.
  - Component generators:
    - Should treat the transformed tokens root (`demo/public/tokens/` in this repo)
      as a **generic entry point**, not a hard-coded implementation.
    - Can either:
      - Apply a naming convention (e.g. `color/surface/default` → `--color-surface-default`), or
      - Scan the CSS files once to align logical names with actual CSS variable names.
  - Different clients are allowed to:
    - Use different CSS file structures
    - Use different class/selector setups
    - As long as semantic tokens are exposed as CSS variables that can be mapped from
      the logical token names.

---

## 4. How Components Use This Contract

1. **From Figma selection**
   - Read collection + variable names (e.g. `Theme` / `color/surface/default`).
2. **From source tokens**
   - Optionally cross-check against `tokens/` JSON to validate that the logical name exists
     and to inspect its semantic meaning or raw values.
3. **From transformed tokens**
   - Use the transformed tokens root to resolve the logical token name to a CSS custom property
     (e.g. `var(--color-surface-default)`).
4. **In React components**
   - Components receive logical state (e.g. `variant`, `state`, `theme`) and map that to:
     - A set of logical token names
     - Which are then used as CSS variables in styles.


