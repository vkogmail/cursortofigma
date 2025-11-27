"use client";

import * as React from "react";
import AtomsButtonTokenized, {
  type Hierarchy,
  type Size,
  type Variant,
} from "./AtomsButtonTokenized";

export interface InteractiveButtonProps {
  label?: string;
  variant?: Variant;
  hierarchy?: Hierarchy;
  size?: Size;
  disabled?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export const InteractiveButton: React.FC<InteractiveButtonProps> = ({
  label = "Button",
  variant = "Default",
  hierarchy = "Primary",
  size = "Lg",
  disabled = false,
  leadingIcon,
  trailingIcon,
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  const [isPressed, setIsPressed] = React.useState(false);

  const getState = (): "Default" | "Hover" | "Focus" | "Disabled" | "On click" => {
    if (disabled) return "Disabled";
    if (isPressed) return "On click";
    if (isFocused) return "Focus";
    if (isHovered) return "Hover";
    return "Default";
  };

  return (
    <AtomsButtonTokenized
      variant={variant}
      hierarchy={hierarchy}
      size={size}
      state={getState()}
      disabled={disabled}
      leadingIcon={leadingIcon}
      trailingIcon={trailingIcon}
      onClick={() => {
        if (!disabled) {
          console.log("Button clicked!");
        }
      }}
      onFocus={() => !disabled && setIsFocused(true)}
      onBlur={() => {
        setIsFocused(false);
        setIsPressed(false);
      }}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => !disabled && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
    >
      {label}
    </AtomsButtonTokenized>
  );
};

export default InteractiveButton;

