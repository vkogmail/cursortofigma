# Component Generation Template

> **⚠️ IMPORTANT:** Before starting, review `component-generation-workflow.md` and `component-structure-learnings.md`

## Figma Selection Snapshot

- **Selection count**: 1
- **Items**:
  - **id**: `2059:41`
  - **name**: `_Atoms/Checkbox base tokenized`
  - **type**: `COMPONENT_SET`
  - **visible**: `true`

---

Next steps:
- Append component description
- Append layout details
- Append bound variables and styles

---

## Component Description (`describe_selection_component`)

- **Component set**
  - **id**: `2059:41`
  - **name**: `_Atoms/Checkbox base tokenized`
  - **kind**: `componentSet`
  - **baseNodeType**: `COMPONENT_SET`

- **Props (variant axes)**
  - **Variant**
    - **kind**: `variant`
    - **options**: `Indeterminate`, `Selected`, `Unselected`
  - **State**
    - **kind**: `variant`
    - **options**: `Default`, `Disabled`, `Hover`, `Focus`

- **Variants overview**
  - Total variants: 12 (combinations of `Variant` × `State`)
  - Examples:
    - `Variant=Unselected, State=Default` (`2059:78`)
      - **Variables used**
        - `color/surface/default` → `fills`
        - `color/border/default` → `strokes`
      - **Structure (high level)**
        - Type: `COMPONENT`
        - Size: `16 × 16`
        - Corner radius: `3`
        - Fill: white
        - Stroke: light gray
    - `Variant=Selected, State=Default` (`2059:70`)
      - **Variables used**
        - `color/surface/action/primary/default` → `fills`
        - `color/foreground/inverse` (on child `Path`) → `fills`
      - **Structure (high level)**
        - Type: `COMPONENT`
        - Size: `16 × 16`
        - Corner radius: `2`
        - Fill: primary blue
        - Stroke: none
        - Child: `Path` (checkmark vector) filled with white
    - `Variant=Indeterminate, State=Default` (`2059:62`)
      - **Variables used**
        - `color/surface/action/primary/default` → `fills`
        - `color/foreground/inverse` (on child `Rectangle`) → `fills`
      - **Structure**
        - Type: `COMPONENT`
        - Size: `16 × 16`
        - Corner radius: `3`
        - Fill: primary blue
        - Child: centered `Rectangle` bar (indeterminate mark)

- **Hover state highlights**
  - `Unselected, Hover` (`2059:81`)
    - **Variables**
      - `color/surface/default` → `fills`
      - `color/border/focus` → `strokes`
    - **Structure**
      - Fill: white
      - Stroke: focus blue
  - `Selected, Hover` (`2059:76`)
    - **Variables**
      - `color/surface/action/primary/default` → `fills`
      - `color/border/focus` → `strokes`
      - `color/foreground/inverse` (checkmark `Path`) → `fills`
    - **Structure**
      - Fill: primary blue
      - Stroke: focus blue

- **Disabled state highlights**
  - Backgrounds and borders use:
    - `color/surface/action/primary/disabled`
    - `color/border/disabled`
  - Checkmark / indeterminate mark use:
    - `color/foreground/disabled`

- **Focus state highlights**
  - Focus variants use:
    - `color/shadow/focusDefault` → `effects` (drop shadow with spread 2)
  - Selected/Indeterminate keep primary blue fills and white foreground marks.

---

## Layout Details (`describe_selection_layout`)

- **Overall**
  - Each variant is a `16 × 16` `COMPONENT` laid out in a grid:
    - Unselected / Selected / Indeterminate along **X** (24, 64, 104)
    - Default / Hover / Disabled / Focus along **Y** (24, 64, 104, 144)

- **Variant frames (all states)**
  - `Unselected` variants
    - Default: `x=24, y=24, width=16, height=16`
    - Hover: `x=24, y=64, width=16, height=16`
    - Disabled: `x=24, y=104, width=16, height=16`
    - Focus: `x=24, y=144, width=16, height=16`
  - `Selected` variants
    - Default: `x=64, y=24, width=16, height=16`
    - Hover: `x=64, y=64, width=16, height=16`
    - Disabled: `x=64, y=104, width=16, height=16`
    - Focus: `x=64, y=144, width=16, height=16`
  - `Indeterminate` variants
    - Default: `x=104, y=24, width≈16.0, height=16`
    - Hover: `x=104, y=64, width≈16.0, height=16`
    - Disabled: `x=104, y=104, width≈16.0, height=16`
    - Focus: `x=104, y=144, width≈16.0, height=16`

- **Inner mark geometry**
  - **Selected** (checkmark `Path`)
    - Appears in all `Selected` variants (`2059:70`, `2059:76`, `2059:74`, `2059:72`) as a child `VECTOR`
    - Local frame (all states):
      - `x≈2.58`, `y≈4.02`, `width≈10.84`, `height≈7.97`
  - **Indeterminate** (horizontal bar)
    - Appears in all `Indeterminate` variants (`2059:62`, `2059:68`, `2059:66`, `2059:64`) as child `RECTANGLE`/`VECTOR`
    - Local frame (all states):
      - `x=3`, `y≈7.17`, `width≈10.0`, `height≈1.67`

- **Auto‑layout inference**
  - No explicit auto‑layout container is exposed here (each variant is a fixed‑size `COMPONENT`).
  - For React implementation, each checkbox instance can be treated as:
    - A `16 × 16` square
    - With either:
      - **No inner mark** (Unselected)
      - **Centered checkmark vector** (Selected)
      - **Centered horizontal bar** (Indeterminate)

---

## Variables & Styles (`get_selection_variables`)

- **Collections involved**
  - `VariableCollectionId:116:1174` → **Theme**
    - `color/surface/page`
    - `color/surface/default`
    - `color/surface/action/primary/default`
    - `color/surface/action/primary/disabled`
    - `color/border/default`
    - `color/border/disabled`
    - `color/foreground/inverse`
    - `color/foreground/disabled`
    - `color/shadow/focusDefault`
  - `VariableCollectionId:af38632b269d1285cc76353a204c070fd69bd898/2057:6107` → **Theme** (sub‑collection id, same Theme set)
    - `color/border/focus`

---

## Variable Collections (`get_variable_collections`)

- **Collection id → name**
  - `VariableCollectionId:116:985` → **Brand**
  - `VariableCollectionId:116:1174` → **Theme**
  - `VariableCollectionId:116:1252` → **Platform**
  - `VariableCollectionId:116:1255` → **Scale**


- **By node**
  - `_Atoms/Checkbox base tokenized` (`2059:41`)
    - `color/surface/page` → `fills`
  - `Variant=Unselected, State=Default` (`2059:78`)
    - `color/surface/default` → `fills`
    - `color/border/default` → `strokes`
  - `Variant=Selected, State=Default` (`2059:70`)
    - `color/surface/action/primary/default` → `fills`
  - `Path` (Selected, Default/ Hover/ Focus) (`2059:71`, `2059:77`, `2059:73`)
    - `color/foreground/inverse` → `fills`
  - `Variant=Indeterminate, State=Default` (`2059:62`)
    - `color/surface/action/primary/default` → `fills`
  - `Rectangle` (Indeterminate mark, Default/Hover/Focus) (`2059:63`, `2059:69`, `2059:65`)
    - `color/foreground/inverse` → `fills`
  - `Variant=Unselected, State=Hover` (`2059:81`)
    - `color/surface/default` → `fills`
    - `color/border/focus` → `strokes`
  - `Variant=Selected, State=Hover` (`2059:76`)
    - `color/surface/action/primary/default` → `fills`
    - `color/border/focus` → `strokes`
  - `Variant=Indeterminate, State=Hover` (`2059:68`)
    - `color/surface/action/primary/default` → `fills`
    - `color/border/focus` → `strokes`
  - `Variant=Unselected, State=Disabled` (`2059:80`)
    - `color/surface/action/primary/disabled` → `fills`
    - `color/border/disabled` → `strokes`
  - `Variant=Selected, State=Disabled` (`2059:74`)
    - `color/surface/action/primary/disabled` → `fills`
    - `color/border/disabled` → `strokes`
  - `Path` (Selected, Disabled) (`2059:75`)
    - `color/foreground/disabled` → `fills`
  - `Variant=Indeterminate, State=Disabled` (`2059:66`)
    - `color/surface/action/primary/disabled` → `fills`
    - `color/border/disabled` → `strokes`
  - `Rectangle` (Indeterminate, Disabled) (`2059:67`)
    - `color/foreground/disabled` → `fills`
  - `Variant=Unselected, State=Focus` (`2059:79`)
    - `color/surface/default` → `fills`
    - `color/border/default` → `strokes`
    - `color/shadow/focusDefault` → `effects`
  - `Variant=Selected, State=Focus` (`2059:72`)
    - `color/surface/action/primary/default` → `fills`
    - `color/shadow/focusDefault` → `effects`
  - `Variant=Indeterminate, State=Focus` (`2059:64`)
    - `color/surface/action/primary/default` → `fills`
    - `color/shadow/focusDefault` → `effects`

- **Implementation‑oriented mapping**
  - **Surface tokens**
    - `color/surface/page`: page background
    - `color/surface/default`: unselected checkbox background (default/hover/focus)
    - `color/surface/action/primary/default`: selected/indeterminate active background
    - `color/surface/action/primary/disabled`: disabled background
  - **Border tokens**
    - `color/border/default`: normal border (unselected, default/focus)
    - `color/border/disabled`: disabled border
    - `color/border/focus`: focus border (hover states)
  - **Foreground tokens**
    - `color/foreground/inverse`: checkmark/indeterminate mark on primary backgrounds
    - `color/foreground/disabled`: checkmark/indeterminate mark when disabled
  - **Shadow tokens**
    - `color/shadow/focusDefault`: focus ring / shadow effect


---

## Structure Analysis

> **Apply learnings from `component-structure-learnings.md`**

### Root Container
- Padding: [Analyze from layout data]
- Alignment: [Analyze from layout data]
- Notes: [Any special cases]

### Internal Frames
- [List each frame with its padding, alignment, gap]

### Structure Pattern Check
- [ ] Matches pattern from learnings doc
- [ ] Deviations: [List any deviations and why]

## Future Template Placeholders (for more complex components)

- **Typography**
  - Text content per variant/state
  - Font family tokens
  - Font size tokens
  - Font weight tokens
  - Line-height tokens

- **Spacing & Auto-layout**
  - Auto-layout direction (horizontal/vertical)
  - Justification & alignment (main/cross axis)
  - Gaps between children
  - Padding (top/right/bottom/left)
  - Min/max width/height constraints

- **Interaction & Accessibility**
  - Additional interaction states: `pressed`, `active`, etc.
  - Keyboard focus order / tab index
  - ARIA roles (e.g. `role="checkbox"`)
  - ARIA attributes (e.g. `aria-checked`, `aria-disabled`, `aria-labelledby`)
  - Motion/transition tokens (if defined)

- **Icon / Vector Geometry**
  - Canonical `viewBox` and rendered size for key icons (e.g. checkmarks, arrows)
  - Local coordinates of important paths relative to the component frame
  - Suggested scaling / centering rules so icons sit correctly inside the target bounds

- **Interactive Behavior Blueprint**
  - Mapping from logical states (e.g. `checked`, `indeterminate`, `disabled`, `hover`, `focus`)
    to Figma variants (`Variant`, `State`) and their token sets
  - Recommended React props shape (e.g. `checked`, `indeterminate`, `disabled`, `onChange`)
  - Event model: how hover/focus/press map to `State` variants in the component set

