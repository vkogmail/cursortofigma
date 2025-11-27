 "use client";
import * as React from "react";
import AtomsCheckboxBaseTokenized from "./AtomsCheckboxBaseTokenized";

export interface InteractiveCheckboxProps {
  label?: string;
  disabled?: boolean;
  defaultChecked?: boolean;
  defaultIndeterminate?: boolean;
}

export const InteractiveCheckbox: React.FC<InteractiveCheckboxProps> = ({
  label,
  disabled,
  defaultChecked,
  defaultIndeterminate,
}) => {
  const [variant, setVariant] = React.useState<
    "Unselected" | "Selected" | "Indeterminate"
  >(
    defaultIndeterminate
      ? "Indeterminate"
      : defaultChecked
      ? "Selected"
      : "Unselected",
  );
  const [interaction, setInteraction] = React.useState<
    "Default" | "Hover" | "Focus"
  >("Default");

  const state: "Default" | "Hover" | "Focus" | "Disabled" = disabled
    ? "Disabled"
    : interaction;

  const toggle = () => {
    if (disabled) return;
    setVariant((prev) =>
      prev === "Selected" ? "Unselected" : "Selected",
    );
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      onMouseEnter={() => !disabled && setInteraction("Hover")}
      onMouseLeave={() => !disabled && setInteraction("Default")}
      onFocus={() => !disabled && setInteraction("Focus")}
      onBlur={() => !disabled && setInteraction("Default")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        padding: 4,
        borderRadius: 6,
        border: "none",
        background: "transparent",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <AtomsCheckboxBaseTokenized Variant={variant} State={state} />
      {label && (
        <span
          style={{
            fontSize: 14,
            color: disabled ? "#999" : "#111",
          }}
        >
          {label}
        </span>
      )}
    </button>
  );
};

export default InteractiveCheckbox;


