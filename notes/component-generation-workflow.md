# Component Generation Workflow

This workflow ensures we apply learnings from previous components and maintain consistency.

> **⚡ Quick Start:** See `QUICK-CHECKLIST.md` for a condensed version of this workflow.

## Pre-Flight Checklist

Before starting a new component, **MUST** review:

1. ✅ Read `component-structure-learnings.md` (especially the "Common Pitfalls" section)
2. ✅ Review similar components we've already built (if any)
3. ✅ Understand the component's purpose and variants

## Step-by-Step Process

### Step 1: Fetch Figma Data

**Tools to use:**
- `get_selection` - Basic selection info
- `describe_selection_component` - Component props, variants, structure
- `describe_selection_layout` - **CRITICAL**: Frame hierarchy, padding, spacing
- `get_selection_variables` - Design tokens used
- `get_styles` - Text styles (if applicable)
- `get_variable_collections` - Collection names for readability

**Output:** Create `notes/figma-selection-{component-name}.md`

### Step 2: Analyze Structure (Apply Learnings)

**Before writing any React code, analyze the structure:**

1. **Identify Root Container**
   - What is the root padding? (Usually 0 or minimal)
   - What is the root alignment? (Usually "center" to center child frames)
   - Does it have any special padding rules?

2. **Identify Internal Frames**
   - What frames exist? (Content, Dropdown, etc.)
   - What padding does each frame have?
   - Is padding symmetric or asymmetric?
   - What is the alignment of each frame?

3. **Check Against Learnings**
   - ❓ Does this match the pattern from `component-structure-learnings.md`?
   - ❓ Are we putting padding in the right place?
   - ❓ Are we using gap vs padding correctly?

**Document findings in the markdown file under "Structure Analysis"**

### Step 3: Map Tokens

1. Extract all variables from Figma
2. Map to logical token names (per `tokens-contract.md`)
3. Verify CSS variables exist in `playground/public/tokens/tokens-base.css`
4. Add missing tokens if needed

**Document in markdown file under "Token Mapping"**

### Step 4: Generate React Component

**Follow this structure:**

```tsx
// 1. Root container style (minimal padding)
const rootStyle: React.CSSProperties = {
  // Minimal or zero padding
  // Alignment for child frames
};

// 2. Internal frame styles (handle their own padding)
const contentFrameStyle: React.CSSProperties = {
  // Own padding values
  // Own alignment
  // Own gap
};

// 3. Render structure
return (
  <button style={rootStyle}>
    <div style={contentFrameStyle}>
      {/* Content */}
    </div>
    {/* Other frames if needed */}
  </button>
);
```

**Key principles:**
- ✅ Root has minimal padding
- ✅ Internal frames handle their own padding
- ✅ Use `gap` for spacing between flex children
- ✅ Use `padding` for spacing within frames
- ✅ Don't use `margin` for internal spacing

### Step 5: Visual QA

1. Export screenshot from Figma using `export_selection_png`
2. Compare with rendered React component
3. Check:
   - Padding matches
   - Spacing matches
   - Alignment matches
   - Colors match (tokens working)

### Step 6: Document Issues & Learnings

If you discover new patterns or issues:
1. Document in the component's markdown file
2. Update `component-structure-learnings.md` if it's a general pattern
3. Update this workflow if the process needs adjustment

## Component-Specific Checklist

For each component, verify:

- [ ] Root container padding is minimal/zero
- [ ] Internal frames have their own padding
- [ ] Padding values match Figma layout data exactly
- [ ] Alignment matches Figma (root vs content frames)
- [ ] Gap/spacing matches Figma
- [ ] All tokens are mapped and available
- [ ] Visual QA passed (screenshot comparison)
- [ ] Component works with all variants
- [ ] Interactive states work (hover, focus, click)

## Red Flags (Stop and Review Learnings)

If you encounter these, **STOP** and review `component-structure-learnings.md`:

- 🚩 Putting all padding on the root container
- 🚩 Using margin for internal spacing
- 🚩 Not checking the actual Figma layout structure
- 🚩 Padding doesn't match Figma values
- 🚩 Structure feels over-complicated
- 🚩 Asymmetric padding not working correctly

## Template for Component Markdown

When creating `notes/figma-selection-{component-name}.md`, include:

```markdown
# {Component Name} - Figma Selection Data

## Structure Analysis

### Root Container
- Padding: [values from Figma]
- Alignment: [value]
- Notes: [any special cases]

### Internal Frames
- Frame 1 (Content):
  - Padding: [values]
  - Alignment: [value]
  - Gap: [value]
- Frame 2 (if exists):
  - ...

### Structure Pattern
- [ ] Matches pattern from learnings doc
- [ ] Deviations: [list any]

## Token Mapping
[Token mapping details]

## Implementation Notes
[Any special considerations]
```

## Continuous Improvement

After each component:
1. Review what worked well
2. Review what was difficult
3. Update learnings if new patterns discovered
4. Update workflow if process can be improved

