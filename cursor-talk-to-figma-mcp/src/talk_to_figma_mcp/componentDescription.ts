import type { NodeVariables } from "./figmaTokenMapping.js";

export type PropKind =
  | "variant"
  | "boolean"
  | "text"
  | "number"
  | "instanceSwap"
  | "unknown";

export interface ComponentProp {
  name: string;
  kind: PropKind;
  options?: Array<string | number | boolean>;
  defaultValue?: string | number | boolean | null;
}

export interface SerializedPaint {
  type: "SOLID" | "GRADIENT_LINEAR" | "GRADIENT_RADIAL" | "GRADIENT_ANGULAR" | "GRADIENT_DIAMOND" | "IMAGE" | "VIDEO";
  visible?: boolean;
  opacity?: number;
  color?: { r: number; g: number; b: number; a?: number };
  gradientStops?: Array<{ position: number; color: { r: number; g: number; b: number; a?: number } }>;
  gradientTransform?: number[][];
  scaleMode?: string;
  imageHash?: string;
  imageTransform?: number[][];
  videoHash?: string;
  videoTransform?: number[][];
}

export interface SerializedEffect {
  type: "DROP_SHADOW" | "INNER_SHADOW" | "LAYER_BLUR" | "BACKGROUND_BLUR";
  visible?: boolean;
  radius: number;
  color?: { r: number; g: number; b: number; a?: number };
  offset?: { x: number; y: number };
  spread?: number;
}

export interface SerializedNode {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  opacity?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  cornerRadius?: number | { topLeft?: number; topRight?: number; bottomLeft?: number; bottomRight?: number };
  fills?: SerializedPaint[];
  strokes?: SerializedPaint[];
  strokeWeight?: number;
  strokeAlign?: "CENTER" | "INSIDE" | "OUTSIDE";
  strokeCap?: "NONE" | "ROUND" | "SQUARE" | "ARROW_LINES" | "ARROW_EQUILATERAL";
  strokeJoin?: "MITER" | "BEVEL" | "ROUND";
  effects?: SerializedEffect[];
  layoutMode?: "NONE" | "HORIZONTAL" | "VERTICAL";
  primaryAxisAlignItems?: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
  counterAxisAlignItems?: "MIN" | "CENTER" | "MAX" | "BASELINE";
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;
  counterAxisSpacing?: number;
  children?: SerializedNode[];
  characters?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  lineHeight?: { value: number; unit: "PIXELS" | "PERCENT" | "AUTO" };
  letterSpacing?: { value: number; unit: "PIXELS" | "PERCENT" };
  textAlignHorizontal?: "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED";
  textAlignVertical?: "TOP" | "CENTER" | "BOTTOM";
  vectorPaths?: Array<{ windingRule: "NONZERO" | "EVENODD"; data: string }>;
  booleanOperation?: "UNION" | "INTERSECT" | "SUBTRACT" | "EXCLUDE";
}

export interface ComponentVariantRaw {
  id: string;
  name: string;
  props: Record<string, string | number | boolean>;
  variableUsage: NodeVariables[];
  structure?: SerializedNode;
}

export type ComponentKind = "componentSet" | "component" | "instance" | "other";

export interface ComponentDescription {
  id: string;
  name: string;
  kind: ComponentKind;
  baseNodeType: string;
  props: ComponentProp[];
  variants: ComponentVariantRaw[];
}


