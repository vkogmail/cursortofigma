import * as React from "react";

type VariantKey = "unselected" | "selected" | "indeterminate";
type StateKey = "default" | "disabled" | "hover" | "focus";

export interface AtomsCheckboxBaseTokenizedProps {
  Variant: "Indeterminate" | "Selected" | "Unselected";
  State: "Default" | "Disabled" | "Hover" | "Focus";
}

interface VisualTokens {
  surface: string;
  border?: string;
  foreground?: string;
  shadow?: string;
}

// Mapping derived from Figma + tokens-contract.md
const TOKENS_BY_STATE: Record<VariantKey, Record<StateKey, VisualTokens>> = {
  unselected: {
    default: {
      surface: "color.surface.default",
      border: "color.border.default",
    },
    hover: {
      surface: "color.surface.default",
      border: "color.border.focus",
    },
    disabled: {
      surface: "color.surface.action.primary.disabled",
      border: "color.border.disabled",
    },
    focus: {
      surface: "color.surface.default",
      border: "color.border.default",
      shadow: "color.shadow.focusDefault",
    },
  },
  selected: {
    default: {
      surface: "color.surface.action.primary.default",
      foreground: "color.foreground.inverse",
    },
    hover: {
      surface: "color.surface.action.primary.default",
      border: "color.border.focus",
      foreground: "color.foreground.inverse",
    },
    disabled: {
      surface: "color.surface.action.primary.disabled",
      border: "color.border.disabled",
      foreground: "color.foreground.disabled",
    },
    focus: {
      surface: "color.surface.action.primary.default",
      shadow: "color.shadow.focusDefault",
      foreground: "color.foreground.inverse",
    },
  },
  indeterminate: {
    default: {
      surface: "color.surface.action.primary.default",
      foreground: "color.foreground.inverse",
    },
    hover: {
      surface: "color.surface.action.primary.default",
      border: "color.border.focus",
      foreground: "color.foreground.inverse",
    },
    disabled: {
      surface: "color.surface.action.primary.disabled",
      border: "color.border.disabled",
      foreground: "color.foreground.disabled",
    },
    focus: {
      surface: "color.surface.action.primary.default",
      shadow: "color.shadow.focusDefault",
      foreground: "color.foreground.inverse",
    },
  },
};

function toVariantKey(v: AtomsCheckboxBaseTokenizedProps["Variant"]): VariantKey {
  switch (v) {
    case "Selected":
      return "selected";
    case "Indeterminate":
      return "indeterminate";
    case "Unselected":
    default:
      return "unselected";
  }
}

function toStateKey(s: AtomsCheckboxBaseTokenizedProps["State"]): StateKey {
  switch (s) {
    case "Hover":
      return "hover";
    case "Disabled":
      return "disabled";
    case "Focus":
      return "focus";
    case "Default":
    default:
      return "default";
  }
}

/**
 * Convert a logical token path into a CSS variable reference.
 * Example: "color.surface.default" -> "var(--color-surface-default)".
 */
function tokenVar(tokenPath: string): string {
  return `var(--${tokenPath.replace(/\./g, "-")})`;
}

export const AtomsCheckboxBaseTokenized: React.FC<
  AtomsCheckboxBaseTokenizedProps
> = (props) => {
  const variantKey = toVariantKey(props.Variant);
  const stateKey = toStateKey(props.State);
  const visual = TOKENS_BY_STATE[variantKey]?.[stateKey];
  if (!visual) return null;

  const bg = tokenVar(visual.surface);
  const borderColor = visual.border ? tokenVar(visual.border) : "transparent";
  const markColor = visual.foreground
    ? tokenVar(visual.foreground)
    : "transparent";
  const focusShadow =
    visual.shadow != null ? `0 0 0 2px ${tokenVar(visual.shadow)}` : "none";

  const isSelected = variantKey === "selected";
  const isIndeterminate = variantKey === "indeterminate";

  const borderRadius =
    variantKey === "selected" && stateKey === "default" ? 2 : 3;

  return (
    <div
      role="checkbox"
      aria-checked={isIndeterminate ? "mixed" : isSelected}
      aria-disabled={stateKey === "disabled" || undefined}
      style={{
        position: "relative",
        display: "inline-flex",
        width: 16,
        height: 16,
        borderRadius,
        backgroundColor: bg,
        borderStyle: "solid",
        borderWidth: visual.border ? 1 : 0,
        borderColor,
        boxShadow: focusShadow,
        alignItems: "center",
        justifyContent: "center",
      }}
      data-variant={props.Variant}
      data-state={props.State}
    >
      {isSelected && (
        <svg
          width={11}
          height={8}
          viewBox="0 0 11 8"
          aria-hidden="true"
          style={{ display: "block", color: markColor }}
        >
          <path
            d="M 10.600208282470703 1.4227083921432495 L 4.300208568572998 7.722708225250244 C 4.143541902303696 7.8793748915195465 3.9318750202655792 7.966875076293945 3.7110416889190674 7.966875076293945 C 3.4902083575725555 7.966875076293945 3.2777083814144135 7.8793748915195465 3.121875047683716 7.722708225250244 L 0.24437500536441803 4.845208168029785 C -0.08145831525325775 4.519374847412109 -0.08145831525325775 3.992708206176758 0.24437500536441803 3.666874885559082 C 0.5702083259820938 3.3410415649414062 1.0968750715255737 3.3410415649414062 1.4227083921432495 3.666874885559082 L 3.7110416889190674 5.9552083015441895 L 9.421875 0.24437500536441803 C 9.747708320617676 -0.08145831525325775 10.274374961853027 -0.08145831525325775 10.600208282470703 0.24437500536441803 C 10.926041603088379 0.5702083259820938 10.926041603088379 1.0968750715255737 10.600208282470703 1.4227083921432495 Z"
            fill="currentColor"
          />
        </svg>
      )}

      {isIndeterminate && (
        <div
          aria-hidden="true"
          style={{
            width: 10,
            height: 1.67,
            borderRadius: 1,
            backgroundColor: markColor,
          }}
        />
      )}
    </div>
  );
};

export default AtomsCheckboxBaseTokenized;
