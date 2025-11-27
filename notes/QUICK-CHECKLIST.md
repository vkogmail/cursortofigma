# Quick Checklist - Component Generation

> **Before starting any component, review this checklist**

## Pre-Flight (5 minutes)

- [ ] Read `component-structure-learnings.md` (focus on "Common Pitfalls")
- [ ] Review `component-generation-workflow.md` (understand the process)
- [ ] Check if similar components exist (review their structure)

## During Development

### Step 1: Fetch Data
- [ ] `get_selection` - Basic info
- [ ] `describe_selection_component` - Props, variants
- [ ] `describe_selection_layout` - **CRITICAL**: Frame structure & padding
- [ ] `get_selection_variables` - Tokens
- [ ] `get_styles` - Text styles (if needed)
- [ ] `get_variable_collections` - Collection names

### Step 2: Analyze Structure (Apply Learnings)
- [ ] Identify root container padding (usually 0 or minimal)
- [ ] Identify internal frames and their padding
- [ ] Check: Does this match the pattern from learnings?
- [ ] Document structure in markdown file

### Step 3: Generate Component
- [ ] Root has minimal/zero padding ✅
- [ ] Internal frames handle their own padding ✅
- [ ] Using `gap` for spacing between children ✅
- [ ] Using `padding` for spacing within frames ✅
- [ ] Not using `margin` for internal spacing ✅

### Step 4: Visual QA
- [ ] Export Figma screenshot
- [ ] Compare with React component
- [ ] Padding matches
- [ ] Spacing matches
- [ ] Alignment matches

## Red Flags (Stop and Review)

If you see these, **STOP** and review learnings:
- 🚩 All padding on root container
- 🚩 Using margin for internal spacing
- 🚩 Padding doesn't match Figma
- 🚩 Structure feels wrong

## Files to Reference

1. `component-structure-learnings.md` - Patterns and pitfalls
2. `component-generation-workflow.md` - Full process
3. `tokens-contract.md` - Token mapping rules
4. `figma-selection.md` - Template for component data

