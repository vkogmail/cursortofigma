# Component Structure Learnings

This document captures key learnings from translating Figma components to React, specifically focusing on structural patterns and common pitfalls.

> **📋 Workflow:** See `component-generation-workflow.md` for the step-by-step process that applies these learnings.

## Button Component Learnings

### Structure Pattern: Root Container + Internal Frames

Figma components often use a **root container** with **internal frames** that handle their own padding and spacing. This is critical to understand when translating to React.

#### Example: Split Button Structure

```
Root Button (Component)
├── paddingLeft: 0
├── paddingRight: 4px (only when trailingIcon exists)
├── paddingTop: 0
├── paddingBottom: 0
├── justifyContent: "center" (centers child frames)
└── Children:
    ├── Content Frame
    │   ├── paddingLeft: 16px (Lg) / 12px (Sm)
    │   ├── paddingRight: 12px (Lg) / 10px (Sm) when trailingIcon, else same as left
    │   ├── paddingTop: 10px (Lg) / 6px (Sm)
    │   ├── paddingBottom: 10px (Lg) / 6px (Sm)
    │   ├── justifyContent: "flex-start" (left-aligns content)
    │   └── gap: 6px (between icon and text)
    │
    └── Dropdown Frame (only when trailingIcon exists)
        ├── paddingRight: 8px
        ├── paddingTop: 0
        ├── paddingBottom: 0
        ├── gap: 12px (Lg) / 10px (Sm) between divider and icon
        └── Children:
            ├── Divider (1px line)
            └── Icon (chevron)
```

### Key Insights

1. **Root container padding is minimal or zero**
   - The root button itself should NOT have the main padding
   - Padding is handled by internal frames (Content, Dropdown)
   - Root may have small right padding (4px) for visual spacing

2. **Content frame handles main padding**
   - Left padding: 16px (Lg) / 12px (Sm)
   - Right padding: Asymmetric when trailingIcon exists (12px Lg / 10px Sm)
   - Top/Bottom padding: 10px (Lg) / 6px (Sm)

3. **Dropdown frame has its own spacing**
   - Right padding: 8px (consistent)
   - Gap between divider and icon: 12px (Lg) / 10px (Sm)
   - No top/bottom padding

4. **Alignment patterns**
   - Root: `justifyContent: "center"` (centers child frames)
   - Content: `justifyContent: "flex-start"` (left-aligns content)
   - Dropdown: `justifyContent: "flex-start"` (left-aligns divider and icon)

### Common Pitfalls to Avoid

1. ❌ **Putting all padding on the root button**
   - This breaks the internal frame structure
   - Makes it impossible to have asymmetric padding

2. ❌ **Using margin instead of padding for internal spacing**
   - Figma uses padding on frames, not margins
   - Use padding for internal frame spacing

3. ❌ **Not checking the actual Figma layout structure**
   - Always use `describe_selection_layout` to see the real structure
   - Don't assume - verify the padding values and frame hierarchy

4. ❌ **Over-complicating the structure**
   - Keep it simple: root → content frame → dropdown frame
   - Don't add unnecessary wrapper divs

### React Implementation Pattern

```tsx
// Root button - minimal padding
const buttonStyle: React.CSSProperties = {
  paddingLeft: 0,
  paddingRight: trailingIcon ? 4 : 0,
  paddingTop: 0,
  paddingBottom: 0,
  justifyContent: "center",
  // ... other styles
};

// Content frame - main padding
const contentStyle: React.CSSProperties = {
  paddingLeft: config.paddingX,
  paddingRight: trailingIcon ? config.paddingXRight : config.paddingX,
  paddingTop: config.paddingY,
  paddingBottom: config.paddingY,
  justifyContent: "flex-start",
  gap: config.gap,
};

// Dropdown frame - spacing for divider + icon
const dropdownStyle: React.CSSProperties = {
  paddingRight: 8,
  gap: config.dropdownGap, // 12px Lg / 10px Sm
};
```

## General Principles for Future Components

### 1. Always Check Figma Structure First
- Use `describe_selection_layout` to get the exact structure
- Look for frame hierarchy: root → child frames → content
- Note padding values on each frame level

### 2. Understand Frame vs Container
- **Root container**: Minimal padding, handles alignment of child frames
- **Content frames**: Handle their own padding and internal spacing
- **Nested frames**: May have their own padding for specific sections

### 3. Padding Patterns
- **Symmetric padding**: Usually on content frames
- **Asymmetric padding**: Common when there's a trailing element (icon, divider)
- **Minimal root padding**: Root containers typically have 0 or very small padding

### 4. Spacing Between Elements
- Use `gap` for spacing between flex children
- Use `padding` for spacing within a frame
- Use `margin` sparingly, only for external spacing

### 5. Alignment Strategy
- Root: Center or space-between (for positioning child frames)
- Content: Flex-start (for left-aligning content)
- Icons: Center (for centering icon within its container)

## Questions to Ask When Building a New Component

1. What is the root container's padding? (Usually 0 or minimal)
2. Are there internal frames? What padding do they have?
3. Is padding symmetric or asymmetric?
4. How are child elements aligned within frames?
5. What is the gap/spacing between elements?
6. Are there special cases (e.g., trailingIcon changes padding)?

## Checklist for Component Translation

- [ ] Fetched layout structure from Figma using `describe_selection_layout`
- [ ] Identified root container and its padding
- [ ] Identified all internal frames and their padding
- [ ] Noted any asymmetric padding patterns
- [ ] Understood alignment strategy (root vs content)
- [ ] Verified spacing between elements (gap vs padding)
- [ ] Tested with all variants (sizes, states, with/without icons)
- [ ] Compared visual result with Figma screenshot

