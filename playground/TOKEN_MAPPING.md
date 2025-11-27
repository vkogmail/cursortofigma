# Token Mapping for AtomsCheckboxBaseTokenized

This document shows which design tokens are applied to which parts of the checkbox component, and what CSS variables they map to.

## Token to CSS Variable Conversion

Tokens are converted to CSS variables using the pattern: `color.surface.default` → `var(--color-surface-default)`

## Token Usage by Variant & State

### Unselected, Default
**Container (nodeId: 2059:78)**
- `color.surface.default` → `var(--color-surface-default)` 
  - Applied to: `backgroundColor` (fills)
  - Fallback RGB: `rgb(255, 255, 255)` (white)
  
- `color.border.default` → `var(--color-border-default)`
  - Applied to: `borderColor` (strokes)
  - Fallback RGB: `rgb(211, 210, 209)` (light gray)

---

### Selected, Default
**Container (nodeId: 2059:70)**
- `color.surface.action.primary.default` → `var(--color-surface-action-primary-default)`
  - Applied to: `backgroundColor` (fills)
  - Fallback RGB: `rgb(6, 80, 208)` (blue)

**Checkmark Path (nodeId: 2059:71)**
- `color.foreground.inverse` → `var(--color-foreground-inverse)`
  - Applied to: SVG `fill` (fills)
  - Fallback RGB: `rgb(255, 255, 255)` (white)

---

### Indeterminate, Default
**Container (nodeId: 2059:62)**
- `color.surface.action.primary.default` → `var(--color-surface-action-primary-default)`
  - Applied to: `backgroundColor` (fills)
  - Fallback RGB: `rgb(6, 80, 208)` (blue)

**Rectangle Indicator (nodeId: 2059:63)**
- `color.foreground.inverse` → `var(--color-foreground-inverse)`
  - Applied to: `backgroundColor` (fills)
  - Fallback RGB: `rgb(255, 255, 255)` (white)

---

### Unselected, Hover
**Container (nodeId: 2059:81)**
- `color.surface.default` → `var(--color-surface-default)`
  - Applied to: `backgroundColor` (fills)
  - Fallback RGB: `rgb(255, 255, 255)` (white)
  
- `color.border.focus` → `var(--color-border-focus)`
  - Applied to: `borderColor` (strokes)
  - Fallback RGB: `rgb(4, 63, 165)` (dark blue)

---

### Selected, Hover
**Container (nodeId: 2059:76)**
- `color.surface.action.primary.default` → `var(--color-surface-action-primary-default)`
  - Applied to: `backgroundColor` (fills)
  - Fallback RGB: `rgb(6, 80, 208)` (blue)
  
- `color.border.focus` → `var(--color-border-focus)`
  - Applied to: `borderColor` (strokes)
  - Fallback RGB: `rgb(4, 63, 165)` (dark blue)

**Checkmark Path (nodeId: 2059:77)**
- `color.foreground.inverse` → `var(--color-foreground-inverse)`
  - Applied to: SVG `fill` (fills)
  - Fallback RGB: `rgb(255, 255, 255)` (white)

---

### Indeterminate, Hover
**Container (nodeId: 2059:68)**
- `color.surface.action.primary.default` → `var(--color-surface-action-primary-default)`
  - Applied to: `backgroundColor` (fills)
  - Fallback RGB: `rgb(6, 80, 208)` (blue)
  
- `color.border.focus` → `var(--color-border-focus)`
  - Applied to: `borderColor` (strokes)
  - Fallback RGB: `rgb(4, 63, 165)` (dark blue)

**Rectangle Indicator (nodeId: 2059:69)**
- `color.foreground.inverse` → `var(--color-foreground-inverse)`
  - Applied to: `backgroundColor` (fills)
  - Fallback RGB: `rgb(255, 255, 255)` (white)

---

### Unselected, Disabled
**Container (nodeId: 2059:80)**
- `color.surface.action.primary.disabled` → `var(--color-surface-action-primary-disabled)`
  - Applied to: `backgroundColor` (fills)
  - Fallback RGB: `rgb(233, 233, 232)` (light gray)
  
- `color.border.disabled` → `var(--color-border-disabled)`
  - Applied to: `borderColor` (strokes)
  - Fallback RGB: `rgb(211, 210, 209)` (gray)

---

### Selected, Disabled
**Container (nodeId: 2059:74)**
- `color.surface.action.primary.disabled` → `var(--color-surface-action-primary-disabled)`
  - Applied to: `backgroundColor` (fills)
  - Fallback RGB: `rgb(233, 233, 232)` (light gray)
  
- `color.border.disabled` → `var(--color-border-disabled)`
  - Applied to: `borderColor` (strokes)
  - Fallback RGB: `rgb(211, 210, 209)` (gray)

**Checkmark Path (nodeId: 2059:75)**
- `color.foreground.disabled` → `var(--color-foreground-disabled)`
  - Applied to: SVG `fill` (fills)
  - Fallback RGB: `rgb(177, 177, 175)` (gray)

---

### Indeterminate, Disabled
**Container (nodeId: 2059:66)**
- `color.surface.action.primary.disabled` → `var(--color-surface-action-primary-disabled)`
  - Applied to: `backgroundColor` (fills)
  - Fallback RGB: `rgb(233, 233, 232)` (light gray)
  
- `color.border.disabled` → `var(--color-border-disabled)`
  - Applied to: `borderColor` (strokes)
  - Fallback RGB: `rgb(211, 210, 209)` (gray)

**Rectangle Indicator (nodeId: 2059:67)**
- `color.foreground.disabled` → `var(--color-foreground-disabled)`
  - Applied to: `backgroundColor` (fills)
  - Fallback RGB: `rgb(177, 177, 175)` (gray)

---

### Unselected, Focus
**Container (nodeId: 2059:79)**
- `color.surface.default` → `var(--color-surface-default)`
  - Applied to: `backgroundColor` (fills)
  - Fallback RGB: `rgb(255, 255, 255)` (white)
  
- `color.border.default` → `var(--color-border-default)`
  - Applied to: `borderColor` (strokes)
  - Fallback RGB: `rgb(211, 210, 209)` (gray)
  
- `color.shadow.focusDefault` → `var(--color-shadow-focusDefault)`
  - Applied to: `boxShadow` (effects)
  - Fallback RGB: `rgba(6, 80, 208, 0.25)` (blue with 25% opacity)
  - Effect: Drop shadow with 2px spread, 0px offset

---

### Selected, Focus
**Container (nodeId: 2059:72)**
- `color.surface.action.primary.default` → `var(--color-surface-action-primary-default)`
  - Applied to: `backgroundColor` (fills)
  - Fallback RGB: `rgb(6, 80, 208)` (blue)
  
- `color.shadow.focusDefault` → `var(--color-shadow-focusDefault)`
  - Applied to: `boxShadow` (effects)
  - Fallback RGB: `rgba(6, 80, 208, 0.25)` (blue with 25% opacity)
  - Effect: Drop shadow with 2px spread, 0px offset

**Checkmark Path (nodeId: 2059:73)**
- `color.foreground.inverse` → `var(--color-foreground-inverse)`
  - Applied to: SVG `fill` (fills)
  - Fallback RGB: `rgb(255, 255, 255)` (white)

---

### Indeterminate, Focus
**Container (nodeId: 2059:64)**
- `color.surface.action.primary.default` → `var(--color-surface-action-primary-default)`
  - Applied to: `backgroundColor` (fills)
  - Fallback RGB: `rgb(6, 80, 208)` (blue)
  
- `color.shadow.focusDefault` → `var(--color-shadow-focusDefault)`
  - Applied to: `boxShadow` (effects)
  - Fallback RGB: `rgba(6, 80, 208, 0.25)` (blue with 25% opacity)
  - Effect: Drop shadow with 2px spread, 0px offset

**Rectangle Indicator (nodeId: 2059:65)**
- `color.foreground.inverse` → `var(--color-foreground-inverse)`
  - Applied to: `backgroundColor` (fills)
  - Fallback RGB: `rgb(255, 255, 255)` (white)

---

## Summary of All Tokens Used

1. **`color.surface.default`** → `var(--color-surface-default)`
   - Used for: Unselected checkbox backgrounds
   - Fallback: White

2. **`color.border.default`** → `var(--color-border-default)`
   - Used for: Default state borders
   - Fallback: Light gray

3. **`color.border.focus`** → `var(--color-border-focus)`
   - Used for: Hover state borders
   - Fallback: Dark blue

4. **`color.border.disabled`** → `var(--color-border-disabled)`
   - Used for: Disabled state borders
   - Fallback: Gray

5. **`color.surface.action.primary.default`** → `var(--color-surface-action-primary-default)`
   - Used for: Selected/Indeterminate checkbox backgrounds
   - Fallback: Blue

6. **`color.surface.action.primary.disabled`** → `var(--color-surface-action-primary-disabled)`
   - Used for: Disabled checkbox backgrounds
   - Fallback: Light gray

7. **`color.foreground.inverse`** → `var(--color-foreground-inverse)`
   - Used for: Checkmark/indicator colors (white on blue)
   - Fallback: White

8. **`color.foreground.disabled`** → `var(--color-foreground-disabled)`
   - Used for: Disabled checkmark/indicator colors
   - Fallback: Gray

9. **`color.shadow.focusDefault`** → `var(--color-shadow-focusDefault)`
   - Used for: Focus ring/shadow effect
   - Fallback: Blue with 25% opacity

## How Tokens Are Applied

The component uses a fallback system:
1. **First**: Tries to find a token mapping for the node's property (fills/strokes/effects)
2. **If found**: Uses CSS variable `var(--token-path)`
3. **If not found**: Falls back to the RGB color from Figma structure data

This ensures the component works even if CSS variables aren't defined, but will use tokens when available.


