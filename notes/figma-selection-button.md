## Figma Selection Snapshot

- **Selection count**: 1
- **Items**:
  - **id**: `2073:236`
  - **name**: `Button Tokenized`
  - **type**: `COMPONENT_SET`
  - **visible**: `true`

---

## Component Description (`describe_selection_component`)

- **Component set**
  - **id**: `2073:236`
  - **name**: `Button Tokenized`
  - **kind**: `componentSet`
  - **baseNodeType**: `COMPONENT_SET`

- **Props (variant axes)**
  - **Variant**
    - **kind**: `variant`
    - **options**: `Default`, `Icon only`, `Filter`
  - **Hierarchy**
    - **kind**: `variant`
    - **options**: `Primary`, `Secondary`, `Tertiary`
  - **Size**
    - **kind**: `variant`
    - **options**: `Lg`, `Sm`, `XS`
  - **State**
    - **kind**: `variant`
    - **options**: `Default`, `Hover`, `Focus`, `Disabled`, `On click`, `Selected`

- **Variants overview**
  - Total variants: Many combinations (Variant × Hierarchy × Size × State)
  - Examples:
    - `Variant=Default, Hierarchy=Primary, Size=Lg, State=Default` (`2073:314`)
      - **Variables used**
        - `Roundings (corners)/Small (Default)` → `topLeftRadius`, `topRightRadius`, `bottomLeftRadius`, `bottomRightRadius`
        - `color/surface/action/primary/default` → `fills`
        - `color/foreground/inverse` → `fills` (on text and icon)
      - **Structure (high level)**
        - Contains text node: "🔤 Button text "
        - Contains icon nodes
        - Contains line/divider elements
    - `Variant=Default, Hierarchy=Secondary, Size=Lg, State=Default` (`2073:348`)
      - **Variables used**
        - `color/surface/default` → `fills`
        - `color/border/action/primary/default` → `strokes`
        - `color/foreground/action/primary/inverse/default` → `fills` (on text and icon)
    - `Variant=Icon only, Hierarchy=Primary, Size=Lg, State=Default` (`2073:595`)
      - **Variables used**
        - `color/surface/action/primary/default` → `fills`
        - `color/foreground/inverse` → `fills` (on icon)

- **State highlights**
  - **Hover states**
    - Primary: `color/surface/action/primary/hover` → `fills`
    - Secondary: `color/border/action/primary/hover` → `strokes`
    - Foreground: `color/foreground/action/primary/inverse/hover` → `fills`
  - **Focus states**
    - Primary: `color/shadow/focusDefault` → `effects`
    - Secondary: `color/shadow/focusDefault` → `effects`
    - Filter: `color/shadow/focusAccent` → `effects`
  - **Disabled states**
    - Primary: `color/surface/action/primary/disabled` → `fills`
    - Secondary: `color/border/disabled` → `strokes`
    - Foreground: `color/foreground/disabled` → `fills`
  - **Pressed/On click states**
    - Primary: `color/surface/action/primary/pressed` → `fills`
    - Primary: `color/shadow/action/pressed` → `effects`
    - Secondary: `color/border/action/primary/pressed` → `strokes`
    - Foreground: `color/foreground/action/primary/inverse/pressed` → `fills`
  - **Selected states**
    - Foreground: `color/foreground/action/primary/inverse/selected` → `fills`

---

## Variables & Styles (`get_selection_variables`)

- **Collections involved**
  - `VariableCollectionId:116:1174` → **Theme**
    - Color tokens (surface, border, foreground, shadow)
  - `VariableCollectionId:03d4c3898501c98f0cbc641c97765d6a395964e4/42953:3` → **Brand** (font/typography collection)
    - `Font/family/button` → `fontFamily`
    - `Font/family/font/weight/regular` → `fontStyle`
    - `Roundings (corners)/Small (Default)` → `topLeftRadius`, `topRightRadius`, `bottomLeftRadius`, `bottomRightRadius`
    - `CTA` → `strokes` and `fills` (for some secondary variants)

- **Collection id → name mapping**
  - `VariableCollectionId:116:985` → **Brand**
  - `VariableCollectionId:116:1174` → **Theme**
  - `VariableCollectionId:116:1252` → **Platform**
  - `VariableCollectionId:116:1255` → **Scale**
  - `VariableCollectionId:03d4c3898501c98f0cbc641c97765d6a395964e4/42953:3` → **Brand** (typography/radius sub-collection)

- **Key variables by usage**

  - **Surface tokens**
    - `color/surface/page` → page background
    - `color/surface/default` → secondary button background
    - `color/surface/action/primary/default` → primary button background (default)
    - `color/surface/action/primary/hover` → primary button background (hover)
    - `color/surface/action/primary/pressed` → primary button background (pressed)
    - `color/surface/action/primary/disabled` → primary button background (disabled)

  - **Border tokens**
    - `color/border/default` → default border
    - `color/border/disabled` → disabled border
    - `color/border/action/primary/default` → primary action border (default)
    - `color/border/action/primary/hover` → primary action border (hover)
    - `color/border/action/primary/pressed` → primary action border (pressed)
    - `color/border/action/accent/default` → accent border (filter variant)

  - **Foreground tokens**
    - `color/foreground/inverse` → text/icon on primary backgrounds
    - `color/foreground/disabled` → disabled text/icon
    - `color/foreground/action/primary/inverse/default` → primary action text/icon (default)
    - `color/foreground/action/primary/inverse/hover` → primary action text/icon (hover)
    - `color/foreground/action/primary/inverse/pressed` → primary action text/icon (pressed)
    - `color/foreground/action/primary/inverse/focus` → primary action text/icon (focus)
    - `color/foreground/action/primary/inverse/selected` → primary action text/icon (selected)
    - `color/foreground/action/accent/inverse/default` → accent action text/icon (filter variant)

  - **Shadow tokens**
    - `color/shadow/focusDefault` → focus ring/shadow (default)
    - `color/shadow/focusAccent` → focus ring/shadow (accent/filter)
    - `color/shadow/action/pressed` → pressed state shadow

  - **Typography tokens**
    - `Font/family/button` → button font family
    - `Font/family/font/weight/regular` → regular font weight

  - **Radius tokens**
    - `Roundings (corners)/Small (Default)` → button corner radius (all corners)

---

## Text Styles (`get_styles`)

- **Available text styles** (from document)
  - `style/button/primary-md` (fontSize: 14, fontName: Apax Regular)
  - `style/button/primary-sm` (fontSize: 11.998, fontName: Apax Medium)
  - `style/button/secondary-md` (fontSize: 14, fontName: Apax Regular)
  - `style/button/secondary-sm` (fontSize: 11.998, fontName: Apax Regular)

- **Note**: The button text nodes use variables for font family (`Font/family/button`) rather than explicit text styles in some cases. The actual font size and weight may be determined by the Size variant (Lg vs Sm vs XS).

---

## Layout Details (`describe_selection_layout`)

- **Overall structure**
  - All button variants use **horizontal auto-layout** (`layoutMode: "HORIZONTAL"`)
  - Main alignment: `primaryAxisAlignItems: "CENTER"` (centered horizontally)
  - Cross alignment: `counterAxisAlignItems: "CENTER"` (centered vertically)

- **Size variants and dimensions**

  - **Size=Lg** (Large)
    - Default/Secondary/Tertiary with text: `width: 158px, height: 32px`
    - Icon only: `width: 32px, height: 32px`
    - Content padding: `paddingLeft: 16px, paddingRight: 12px, paddingTop: 10px, paddingBottom: 10px`
    - Item spacing (gap between icons/text): `itemSpacing: 6px`
    - Icon size: `16×16px`

  - **Size=Sm** (Small)
    - Default/Secondary with text: `width: 134px, height: 28px`
    - Icon only: `width: 28px, height: 28px`
    - Content padding: `paddingLeft: 12px, paddingRight: 10px, paddingTop: 6px, paddingBottom: 6px`
    - Item spacing: `itemSpacing: 6px`
    - Icon size: `13×13px` (or `12×12px` for some variants)

  - **Size=XS** (Extra Small)
    - Icon only: `width: 20px, height: 20px`
    - Padding: `paddingLeft: 8px, paddingRight: 8px, paddingTop: 8px, paddingBottom: 8px`
    - Icon size: `9×9px`

- **Component structure** (Default variant with text)

  - **Root container** (button frame)
    - Auto-layout: `HORIZONTAL`, `CENTER` alignment
    - Contains: `Content` frame + optional `Dropdown` frame

  - **Content frame** (main button content)
    - Auto-layout: `HORIZONTAL`, `MIN` alignment (left-aligned content)
    - Contains: Leading icon (optional) → Text → Trailing icon (optional)
    - Gap between children: `itemSpacing: 6px`

  - **Dropdown frame** (optional, for split buttons)
    - Auto-layout: `HORIZONTAL`, `MIN` alignment
    - Contains: `Line` (divider) + `Icon` (dropdown arrow)
    - Gap: `itemSpacing: 12px` (Lg) or `10px` (Sm)
    - Line: `width: 1px, height: 32px` (Lg) or `28px` (Sm)

- **Icon positioning**

  - **Icon only variants**
    - Icon centered within button frame
    - Padding: `8px` on all sides (Lg/Sm/XS)
    - Icon size scales with Size variant (16px → 13px → 9px)

  - **Icons in text buttons**
    - Leading icon: positioned at start of Content frame
    - Trailing icon: positioned at end of Content frame
    - Icons aligned vertically centered with text

- **Text node**
  - Text content: "🔤 Button text " (placeholder)
  - Height: `20px` (Lg) or `20px` (Sm)
  - Positioned between icons with `6px` gap on each side

- **Tertiary variant specifics**
  - Size=Lg: `width: 89px, height: 32px`
  - Padding: `paddingTop: 8px, paddingBottom: 8px` (no left/right padding on root)
  - Item spacing: `6px`
  - Size=Sm: `width: 91px, height: 28px`
  - Padding: `paddingLeft: 8px, paddingRight: 8px, paddingTop: 6px, paddingBottom: 6px`

- **Filter variant**
  - Size=Sm: `width: 82px, height: 28px`
  - Content frame: `width: 80px`
  - Same padding/spacing as other Sm variants

- **Auto-layout summary**
  - All buttons use horizontal flexbox-like layout
  - Content is center-aligned within button bounds
  - Icons and text are left-aligned within Content frame
  - Consistent `6px` gap between icons and text
  - Padding scales with Size variant (16/12/10 for Lg, 12/10/6 for Sm)

---

## Implementation Notes

- **Missing variables**: Some variants may reference variables that don't exist in the token system yet. These should be documented and handled gracefully (fallback values or warnings).

- **Text styles**: The component uses both:
  - Font family variables (`Font/family/button`)
  - Potentially text styles (`style/button/primary-md`, etc.)
  - Need to determine which takes precedence or how they combine

- **Typography mapping**: 
  - Font family: `Font/family/button` → maps to logical token path (needs verification against source tokens)
  - Font size: Determined by Size variant (Lg, Sm, XS) - may map to typography size tokens
  - Font weight: May be determined by Hierarchy or State

- **Interactive behavior**:
  - Click → `On click` state
  - Hover → `Hover` state
  - Focus → `Focus` state
  - Disabled → `Disabled` state
  - Selected → `Selected` state (for filter variant)

---

## Future Template Placeholders (for more complex components)

- **Typography**
  - Text content per variant/state
  - Font family tokens
  - Font size tokens (mapped from Size variant)
  - Font weight tokens
  - Line-height tokens

- **Spacing & Auto-layout**
  - Auto-layout direction (horizontal for buttons)
  - Justification & alignment (center for buttons)
  - Gaps between text and icons
  - Padding (top/right/bottom/left) - varies by Size
  - Min/max width/height constraints

- **Interaction & Accessibility**
  - Additional interaction states: `pressed`, `active`, etc.
  - Keyboard focus order / tab index
  - ARIA roles (e.g. `role="button"`)
  - ARIA attributes (e.g. `aria-disabled`, `aria-pressed`, `aria-label`)
  - Motion/transition tokens (if defined)

- **Icon / Vector Geometry**
  - Icon size and positioning relative to text
  - Icon spacing/gap from text
  - Icon alignment (leading vs trailing)

- **Interactive Behavior Blueprint**
  - Mapping from logical states (e.g. `disabled`, `hover`, `focus`, `pressed`, `selected`)
    to Figma variants (`Variant`, `Hierarchy`, `Size`, `State`) and their token sets
  - Recommended React props shape (e.g. `variant`, `hierarchy`, `size`, `state`, `disabled`, `onClick`, `children`)
  - Event model: how hover/focus/press map to `State` variants in the component set

