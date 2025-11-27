import * as React from "react";

type Variant = "Default" | "Icon only" | "Filter";
type Hierarchy = "Primary" | "Secondary" | "Tertiary";
type Size = "Lg" | "Sm" | "XS";
type State = "Default" | "Hover" | "Focus" | "Disabled" | "On click" | "Selected";

export interface AtomsButtonTokenizedProps {
  variant?: Variant;
  hierarchy?: Hierarchy;
  size?: Size;
  state?: State;
  children?: React.ReactNode;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onMouseDown?: () => void;
  onMouseUp?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

/**
 * Convert a logical token path into a CSS variable reference.
 * Assumes transformed tokens expose: --color-surface-default, --color-border-default, etc.
 * Handles special characters (spaces, parentheses) by normalizing them.
 */
function tokenVar(tokenPath: string): string {
  // Normalize: replace / with -, remove spaces, remove parentheses, lowercase
  const normalized = tokenPath
    .replace(/\//g, "-")
    .replace(/\s+/g, "-")
    .replace(/[()]/g, "")
    .toLowerCase();
  return `var(--${normalized})`;
}

interface VisualTokens {
  surface: string;
  border?: string;
  foreground: string;
  shadow?: string;
  radius?: string;
}

const TOKENS_BY_VARIANT: Record<
  Variant,
  Record<Hierarchy, Record<State, VisualTokens>>
> = {
  Default: {
    Primary: {
      Default: {
        surface: "color/surface/action/primary/default",
        foreground: "color/foreground/inverse",
        radius: "Roundings (corners)/Small (Default)",
      },
      Hover: {
        surface: "color/surface/action/primary/hover",
        foreground: "color/foreground/inverse",
        radius: "Roundings (corners)/Small (Default)",
      },
      Focus: {
        surface: "color/surface/action/primary/default",
        foreground: "color/foreground/inverse",
        shadow: "color/shadow/focusDefault",
        radius: "Roundings (corners)/Small (Default)",
      },
      Disabled: {
        surface: "color/surface/action/primary/disabled",
        foreground: "color/foreground/disabled",
        radius: "Roundings (corners)/Small (Default)",
      },
      "On click": {
        surface: "color/surface/action/primary/pressed",
        foreground: "color/foreground/inverse",
        shadow: "color/shadow/action/pressed",
        radius: "Roundings (corners)/Small (Default)",
      },
      Selected: {
        surface: "color/surface/action/primary/default",
        foreground: "color/foreground/inverse",
        radius: "Roundings (corners)/Small (Default)",
      },
    },
    Secondary: {
      Default: {
        surface: "color/surface/default",
        border: "color/border/action/primary/default",
        foreground: "color/foreground/action/primary/inverse/default",
        radius: "Roundings (corners)/Small (Default)",
      },
      Hover: {
        surface: "color/surface/default",
        border: "color/border/action/primary/hover",
        foreground: "color/foreground/action/primary/inverse/hover",
        radius: "Roundings (corners)/Small (Default)",
      },
      Focus: {
        surface: "color/surface/default",
        border: "color/border/default",
        foreground: "color/foreground/action/primary/inverse/focus",
        shadow: "color/shadow/focusDefault",
        radius: "Roundings (corners)/Small (Default)",
      },
      Disabled: {
        surface: "color/surface/default",
        border: "color/border/disabled",
        foreground: "color/foreground/disabled",
        radius: "Roundings (corners)/Small (Default)",
      },
      "On click": {
        surface: "color/surface/default",
        border: "color/border/action/primary/pressed",
        foreground: "color/foreground/action/primary/inverse/pressed",
        radius: "Roundings (corners)/Small (Default)",
      },
      Selected: {
        surface: "color/surface/default",
        border: "color/border/action/primary/default",
        foreground: "color/foreground/action/primary/inverse/selected",
        radius: "Roundings (corners)/Small (Default)",
      },
    },
    Tertiary: {
      Default: {
        surface: "color/surface/default",
        foreground: "color/foreground/action/primary/inverse/default",
        radius: "Roundings (corners)/Small (Default)",
      },
      Hover: {
        surface: "color/surface/default",
        foreground: "color/foreground/action/primary/inverse/hover",
        radius: "Roundings (corners)/Small (Default)",
      },
      Focus: {
        surface: "color/surface/default",
        foreground: "color/foreground/action/primary/inverse/focus",
        shadow: "color/shadow/focusDefault",
        radius: "Roundings (corners)/Small (Default)",
      },
      Disabled: {
        surface: "color/surface/default",
        foreground: "color/foreground/disabled",
        radius: "Roundings (corners)/Small (Default)",
      },
      "On click": {
        surface: "color/surface/default",
        foreground: "color/foreground/action/primary/inverse/pressed",
        radius: "Roundings (corners)/Small (Default)",
      },
      Selected: {
        surface: "color/surface/default",
        foreground: "color/foreground/action/primary/inverse/selected",
        radius: "Roundings (corners)/Small (Default)",
      },
    },
  },
  "Icon only": {
    Primary: {
      Default: {
        surface: "color/surface/action/primary/default",
        foreground: "color/foreground/inverse",
        radius: "Roundings (corners)/Small (Default)",
      },
      Hover: {
        surface: "color/surface/action/primary/hover",
        foreground: "color/foreground/inverse",
        radius: "Roundings (corners)/Small (Default)",
      },
      Focus: {
        surface: "color/surface/action/primary/default",
        foreground: "color/foreground/inverse",
        shadow: "color/shadow/focusDefault",
        radius: "Roundings (corners)/Small (Default)",
      },
      Disabled: {
        surface: "color/surface/action/primary/disabled",
        foreground: "color/foreground/disabled",
        radius: "Roundings (corners)/Small (Default)",
      },
      "On click": {
        surface: "color/surface/action/primary/pressed",
        foreground: "color/foreground/inverse",
        shadow: "color/shadow/action/pressed",
        radius: "Roundings (corners)/Small (Default)",
      },
      Selected: {
        surface: "color/surface/action/primary/default",
        foreground: "color/foreground/inverse",
        radius: "Roundings (corners)/Small (Default)",
      },
    },
    Secondary: {
      Default: {
        surface: "color/surface/default",
        border: "color/border/action/primary/default",
        foreground: "color/foreground/action/primary/inverse/default",
        radius: "Roundings (corners)/Small (Default)",
      },
      Hover: {
        surface: "color/surface/default",
        border: "color/border/action/primary/hover",
        foreground: "color/foreground/action/primary/inverse/hover",
        radius: "Roundings (corners)/Small (Default)",
      },
      Focus: {
        surface: "color/surface/default",
        border: "color/border/default",
        foreground: "color/foreground/action/primary/inverse/focus",
        shadow: "color/shadow/focusDefault",
        radius: "Roundings (corners)/Small (Default)",
      },
      Disabled: {
        surface: "color/surface/default",
        border: "color/border/disabled",
        foreground: "color/foreground/disabled",
        radius: "Roundings (corners)/Small (Default)",
      },
      "On click": {
        surface: "color/surface/default",
        border: "color/border/action/primary/pressed",
        foreground: "color/foreground/action/primary/inverse/pressed",
        radius: "Roundings (corners)/Small (Default)",
      },
      Selected: {
        surface: "color/surface/default",
        border: "color/border/action/primary/default",
        foreground: "color/foreground/action/primary/inverse/default",
        radius: "Roundings (corners)/Small (Default)",
      },
    },
    Tertiary: {
      Default: {
        surface: "color/surface/default",
        foreground: "color/foreground/action/primary/inverse/default",
        radius: "Roundings (corners)/Small (Default)",
      },
      Hover: {
        surface: "color/surface/default",
        foreground: "color/foreground/action/primary/inverse/hover",
        radius: "Roundings (corners)/Small (Default)",
      },
      Focus: {
        surface: "color/surface/default",
        foreground: "color/foreground/action/primary/inverse/focus",
        shadow: "color/shadow/focusDefault",
        radius: "Roundings (corners)/Small (Default)",
      },
      Disabled: {
        surface: "color/surface/default",
        foreground: "color/foreground/disabled",
        radius: "Roundings (corners)/Small (Default)",
      },
      "On click": {
        surface: "color/surface/default",
        foreground: "color/foreground/action/primary/inverse/pressed",
        radius: "Roundings (corners)/Small (Default)",
      },
      Selected: {
        surface: "color/surface/default",
        foreground: "color/foreground/action/primary/inverse/selected",
        radius: "Roundings (corners)/Small (Default)",
      },
    },
  },
  Filter: {
    Primary: {
      Default: {
        surface: "color/surface/default",
        border: "color/border/action/accent/default",
        foreground: "color/foreground/action/accent/inverse/default",
        radius: "Roundings (corners)/Small (Default)",
      },
      Hover: {
        surface: "color/surface/default",
        border: "color/border/action/accent/default",
        foreground: "color/foreground/action/accent/inverse/default",
        radius: "Roundings (corners)/Small (Default)",
      },
      Focus: {
        surface: "color/surface/default",
        border: "color/border/action/accent/default",
        foreground: "color/foreground/action/accent/inverse/default",
        shadow: "color/shadow/focusAccent",
        radius: "Roundings (corners)/Small (Default)",
      },
      Disabled: {
        surface: "color/surface/default",
        border: "color/border/disabled",
        foreground: "color/foreground/disabled",
        radius: "Roundings (corners)/Small (Default)",
      },
      "On click": {
        surface: "color/surface/default",
        border: "color/border/action/accent/pressed",
        foreground: "color/foreground/action/accent/inverse/pressed",
        radius: "Roundings (corners)/Small (Default)",
      },
      Selected: {
        surface: "color/surface/default",
        border: "color/border/action/accent/default",
        foreground: "color/foreground/action/accent/inverse/default",
        radius: "Roundings (corners)/Small (Default)",
      },
    },
    Secondary: {
      Default: {
        surface: "color/surface/default",
        border: "color/border/action/accent/default",
        foreground: "color/foreground/action/accent/inverse/default",
        radius: "Roundings (corners)/Small (Default)",
      },
      Hover: {
        surface: "color/surface/default",
        border: "color/border/action/accent/hover",
        foreground: "color/foreground/action/accent/inverse/hover",
        radius: "Roundings (corners)/Small (Default)",
      },
      Focus: {
        surface: "color/surface/default",
        border: "color/border/action/accent/default",
        foreground: "color/foreground/action/accent/inverse/default",
        shadow: "color/shadow/focusAccent",
        radius: "Roundings (corners)/Small (Default)",
      },
      Disabled: {
        surface: "color/surface/default",
        border: "color/border/disabled",
        foreground: "color/foreground/disabled",
        radius: "Roundings (corners)/Small (Default)",
      },
      "On click": {
        surface: "color/surface/default",
        border: "color/border/action/accent/pressed",
        foreground: "color/foreground/action/accent/inverse/pressed",
        radius: "Roundings (corners)/Small (Default)",
      },
      Selected: {
        surface: "color/surface/default",
        border: "color/border/action/accent/default",
        foreground: "color/foreground/action/accent/inverse/default",
        radius: "Roundings (corners)/Small (Default)",
      },
    },
    Tertiary: {
      Default: {
        surface: "color/surface/default",
        foreground: "color/foreground/action/accent/inverse/default",
        radius: "Roundings (corners)/Small (Default)",
      },
      Hover: {
        surface: "color/surface/default",
        foreground: "color/foreground/action/accent/inverse/hover",
        radius: "Roundings (corners)/Small (Default)",
      },
      Focus: {
        surface: "color/surface/default",
        foreground: "color/foreground/action/accent/inverse/focus",
        shadow: "color/shadow/focusAccent",
        radius: "Roundings (corners)/Small (Default)",
      },
      Disabled: {
        surface: "color/surface/default",
        foreground: "color/foreground/disabled",
        radius: "Roundings (corners)/Small (Default)",
      },
      "On click": {
        surface: "color/surface/default",
        foreground: "color/foreground/action/accent/inverse/pressed",
        radius: "Roundings (corners)/Small (Default)",
      },
      Selected: {
        surface: "color/surface/default",
        foreground: "color/foreground/action/accent/inverse/selected",
        radius: "Roundings (corners)/Small (Default)",
      },
    },
  },
};

// Size-based dimensions and padding
const SIZE_CONFIG: Record<
  Size,
  {
    height: number;
    width?: number; // undefined = auto
    paddingX: number;
    paddingY: number;
    iconSize: number;
    fontSize: number;
    gap: number;
  }
> = {
  Lg: {
    height: 32,
    paddingX: 16,
    paddingY: 10,
    iconSize: 16,
    fontSize: 14,
    gap: 6,
  },
  Sm: {
    height: 28,
    paddingX: 12,
    paddingY: 6,
    iconSize: 13,
    fontSize: 12,
    gap: 6,
  },
  XS: {
    height: 20,
    paddingX: 8,
    paddingY: 8,
    iconSize: 9,
    fontSize: 11,
    gap: 0,
  },
};

export const AtomsButtonTokenized: React.FC<AtomsButtonTokenizedProps> = ({
  variant = "Default",
  hierarchy = "Primary",
  size = "Lg",
  state = "Default",
  children,
  leadingIcon,
  trailingIcon,
  disabled,
  onClick,
  onFocus,
  onBlur,
  onMouseDown,
  onMouseUp,
  onMouseEnter,
  onMouseLeave,
}) => {
  const visual = TOKENS_BY_VARIANT[variant]?.[hierarchy]?.[state];
  if (!visual) return null;

  const config = SIZE_CONFIG[size];
  const isIconOnly = variant === "Icon only";
  const isDisabled = disabled || state === "Disabled";

  const bg = tokenVar(visual.surface);
  const borderColor = visual.border
    ? tokenVar(visual.border)
    : "transparent";
  const textColor = tokenVar(visual.foreground);
  const focusShadow = visual.shadow
    ? `0 0 0 2px ${tokenVar(visual.shadow)}`
    : "none";
  
  // Handle radius token - convert "Roundings (corners)/Small (Default)" to CSS var format
  // Use tokenVar helper which normalizes the token name, with fallback if token not found
  // The CSS variable might not exist yet, so use a sensible fallback (typically 3-4px for "Small")
  const radiusToken = visual.radius ? tokenVar(visual.radius) : null;
  // tokenVar returns "var(--name)", we need to add fallback: "var(--name, 3px)"
  const borderRadius = radiusToken 
    ? radiusToken.slice(0, -1) + ", 3px)" // Remove closing paren, add fallback
    : "3px"; // fallback if no radius token specified

  // Font family from token (if available) - use fallback if not found
  const fontFamily = "var(--font-family-button, system-ui, sans-serif)";

  const buttonStyle: React.CSSProperties = {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: config.height,
    minWidth: isIconOnly ? config.height : undefined,
    paddingLeft: isIconOnly ? config.paddingX : 0, // No padding on root button
    paddingRight: isIconOnly ? config.paddingX : (trailingIcon ? 4 : 0), // 4px right padding when trailingIcon per Figma
    paddingTop: isIconOnly ? config.paddingY : 0,
    paddingBottom: isIconOnly ? config.paddingY : 0,
    borderRadius,
    backgroundColor: bg,
    borderStyle: visual.border ? "solid" : "none",
    borderWidth: visual.border ? 1 : 0,
    borderColor: visual.border ? borderColor : "transparent",
    boxShadow: focusShadow,
    color: textColor,
    fontFamily,
    fontSize: config.fontSize,
    fontWeight: hierarchy === "Primary" ? 500 : 400,
    lineHeight: 1,
    cursor: isDisabled ? "not-allowed" : "pointer",
    opacity: isDisabled ? 0.6 : 1,
    transition: "all 0.2s ease",
    gap: 0,
  };

  const contentStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: config.gap,
    paddingLeft: config.paddingX, // 16px for Lg
    paddingRight: trailingIcon ? (size === "Lg" ? 12 : 10) : config.paddingX, // 12px for Lg when trailingIcon
    paddingTop: config.paddingY, // 10px for Lg
    paddingBottom: config.paddingY, // 10px for Lg
  };

  const iconStyle: React.CSSProperties = {
    width: config.iconSize,
    height: config.iconSize,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };

  return (
    <button
      role="button"
      aria-disabled={isDisabled || undefined}
      disabled={isDisabled}
      onClick={onClick}
      onFocus={onFocus}
      onBlur={onBlur}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={buttonStyle}
    >
      {isIconOnly ? (
        <div style={iconStyle}>
          {leadingIcon || trailingIcon || (
            <span style={{ fontSize: config.iconSize }}>⚙</span>
          )}
        </div>
      ) : (
        <>
          {/* Content frame - main button content */}
          <div style={contentStyle}>
            {leadingIcon && <div style={iconStyle}>{leadingIcon}</div>}
            {children && <span>{children}</span>}
          </div>
          {/* Dropdown frame - divider + icon (for split buttons) */}
          {trailingIcon && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                paddingRight: 8, // 8px right padding per Figma
                gap: size === "Lg" ? 12 : 10, // 12px itemSpacing between divider and icon per Figma
              }}
            >
              {/* Divider line - light blue for primary buttons */}
              <div
                style={{
                  width: 1,
                  height: config.height,
                  backgroundColor:
                    hierarchy === "Primary"
                      ? "rgba(255, 255, 255, 0.4)" // Light blue/white with opacity for primary buttons
                      : tokenVar("color/border/default"),
                }}
                aria-hidden="true"
              />
              {/* Chevron icon */}
              <div style={iconStyle}>{trailingIcon}</div>
            </div>
          )}
        </>
      )}
    </button>
  );
};

export default AtomsButtonTokenized;

