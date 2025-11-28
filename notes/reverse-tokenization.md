# Reverse Tokenization - Auto-apply Tokens to Components

## Overview

The `auto_apply_tokens` tool automatically matches and applies design tokens to Figma components that don't have variables applied yet. This is useful for tokenizing existing components.

## How It Works

1. **Fetches actual values** from the selected Figma component (colors, spacing, typography, etc.)
2. **Matches values to tokens** by comparing actual values with available Figma variables
3. **Applies tokens** by binding the matched variables to component properties

## Usage

### Basic Usage

```typescript
// Select a component in Figma, then call:
auto_apply_tokens({
  componentDescription: "primary button", // Optional: helps with semantic matching
  applyTokens: true, // Default: true - actually apply tokens
  tolerance: 2 // Default: 2px - tolerance for numeric matching
})
```

### Parameters

- **`componentDescription`** (optional): Description of the component to help with semantic token matching
  - Example: `"primary button"`, `"card container"`, `"input field"`
  
- **`nodeId`** (optional): Specific node ID. If not provided, uses the current selection.

- **`applyTokens`** (default: `true`): Whether to actually apply the matched tokens to Figma
  - If `false`, only returns matches without applying (useful for preview)

- **`tolerance`** (default: `2`): Tolerance for numeric value matching in pixels
  - Used for spacing, radius, etc.
  - Example: If tolerance is 2px, a value of 16px will match tokens with values 14-18px

## Token Selection Rules

### ⚠️ Foundation Tokens Excluded

**IMPORTANT**: The tool **never uses foundation tokens**. Only theme tokens are considered for matching.

**Excluded collections** (foundation tokens):
- `Brand` - Brand colors and values
- `Scale` - Base spacing, sizing scales
- `Platform` - Platform-specific tokens
- `Typography` - Base typography scales
- `Effect` - Base effect tokens
- `Foundation` - Any collection named "Foundation"

**Included collections** (theme tokens):
- `Theme` - Semantic theme tokens (e.g., `color/surface/action/primary/default`)

This ensures components use semantic tokens that adapt to themes, rather than hardcoded foundation values.

## Matching Algorithm

### Color Matching

- Converts colors to RGB space
- Calculates Euclidean distance between actual color and token colors
- Confidence levels:
  - **Exact match** (distance = 0): 100% confidence
  - **Close match** (distance < 10): 95% confidence
  - **Close match** (distance < 30): 85% confidence
  - **Semantic match** (distance > 30): 50-80% confidence

### Numeric Matching (Spacing, Radius, etc.)

- Compares actual values with token values
- Confidence levels:
  - **Exact match** (difference = 0): 100% confidence
  - **Close match** (within tolerance): 95% confidence
  - **Close match** (within 2× tolerance): 85% confidence
  - **Semantic match** (beyond tolerance): 50-80% confidence

## Properties Matched

The tool automatically matches:

- **Colors**: `fills`, `strokes`
- **Spacing**: `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft`, `itemSpacing`
- **Radius**: `cornerRadius`
- **Typography**: `fontSize`, `fontWeight` (more coming)

## Example Workflow

1. **Select a component** in Figma that doesn't have tokens applied
2. **Call the tool** with a description:
   ```
   auto_apply_tokens({
     componentDescription: "primary button",
     applyTokens: true
   })
   ```
3. **Review the results** - the tool will show:
   - Which properties were matched
   - Confidence levels for each match
   - Which tokens were applied
   - Any failures

## Output Format

```
Token matching for node "Button":
Matches found:
  fills: color/surface/action/primary/default (confidence: 95%, type: close)
  cornerRadius: Roundings (corners)/Small (Default) (confidence: 100%, type: exact)
  paddingTop: Scale/Spacing/Medium (confidence: 95%, type: close)

Successfully applied 3 tokens:
  fills → color/surface/action/primary/default (95% confidence)
  cornerRadius → Roundings (corners)/Small (Default) (100% confidence)
  paddingTop → Scale/Spacing/Medium (95% confidence)
```

## Tips

1. **Use component descriptions** - They help with semantic matching when multiple tokens have similar values
2. **Adjust tolerance** - For strict matching, use `tolerance: 0`. For more flexible matching, use `tolerance: 4` or higher
3. **Preview first** - Set `applyTokens: false` to see matches before applying
4. **Check confidence** - Lower confidence matches (< 80%) may need manual review

## Limitations

- Currently matches against all available Figma variables
- Semantic matching is basic (value-based only)
- Typography matching is limited (fontSize, fontWeight only for now)
- Complex properties (gradients, effects) are not yet supported

## Future Enhancements

- Semantic matching using component description
- Support for gradients and effects
- Typography style matching (fontFamily, lineHeight, etc.)
- Batch processing for multiple components
- Learning from user corrections

