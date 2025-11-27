// Generic TypeScript types mirroring the JSON returned by the
// Figma plugin `describe_component` command.
//
// This is intentionally *generic* so it can describe any Figma
// component / component set / instance. It does not assume
// checkboxes, buttons, or any particular design system.

import type { NodeVariables } from "./figmaTokenMapping";

export type PropKind =
  | "variant"
  | "boolean"
  | "text"
  | "number"
  | "instanceSwap"
  | "unknown";

export interface ComponentProp {
  /** Figma property/axis name, e.g. "Size", "State", "checked" */
  name: string;
  /** Generic kind inferred from Figma APIs */
  kind: PropKind;
  /**
   * Optional set of allowed values for enum/variant-like props.
   * For example: ["sm", "md", "lg"] or ["default", "hover"].
   */
  options?: Array<string | number | boolean>;
  /**
   * Default value for this prop as reported by Figma, if any.
   */
  defaultValue?: string | number | boolean | null;
}

/**
 * One "variant" as reported by the plugin.
 *
 * This corresponds to:
 * - a child COMPONENT of a COMPONENT_SET, or
 * - a standalone COMPONENT, or
 * - an INSTANCE (fallback) if no main component is available.
 */
export interface ComponentVariantRaw {
  /** Figma node ID for this variant's component/instance */
  id: string;
  /** Figma node name (often encodes variant props) */
  name: string;
  /**
   * Raw variant properties from Figma, e.g.:
   *   { Size: "md", State: "hover" }
   */
  props: Record<string, string | number | boolean>;
  /**
   * Variable usage for this variant, using the same shape as
   * the existing `get_selection_variables` tool:
   *   [{ nodeId, nodeName, variables: [{ id, name, collectionId, props: [...] }] }]
   *
   * This is kept generic so we can feed it directly into the
   * mapping helpers in `figmaTokenMapping.ts`.
   */
  variableUsage: NodeVariables[];
}

export type ComponentKind = "componentSet" | "component" | "instance" | "other";

export interface ComponentDescription {
  /** Root component/component-set/instance ID */
  id: string;
  /** Human-readable name of the root (Figma name) */
  name: string;
  /** High-level classification by the plugin */
  kind: ComponentKind;
  /** Raw Figma node.type for the originally selected node */
  baseNodeType: string;
  /** Generic props/axes inferred from Figma */
  props: ComponentProp[];
  /** All variants discovered under this component family */
  variants: ComponentVariantRaw[];
}


