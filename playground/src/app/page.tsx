import AtomsCheckboxBaseTokenized from "../components/AtomsCheckboxBaseTokenized";
import InteractiveCheckbox from "../components/InteractiveCheckbox";
import AtomsButtonTokenized from "../components/AtomsButtonTokenized";
import InteractiveButton from "../components/InteractiveButton";

// Simple icon components matching Figma design
const PlusIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display: "block" }}>
    <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
  </svg>
);

const DropdownIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display: "block" }}>
    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

const EllipsisIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display: "block" }}>
    <circle cx="4" cy="8" r="1.5" fill="currentColor" />
    <circle cx="8" cy="8" r="1.5" fill="currentColor" />
    <circle cx="12" cy="8" r="1.5" fill="currentColor" />
  </svg>
);

const FilterIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display: "block" }}>
    <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
  </svg>
);

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "24px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        background: "#f5f5f5",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 32,
        }}
      >
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>
            Figma Component Playground
          </h1>
          <p style={{ fontSize: 14, color: "#666" }}>
            Components generated from Figma using design tokens
          </p>
        </div>

        {/* Checkbox Component Section */}
        <section
          style={{
            padding: 24,
            borderRadius: 12,
            background: "white",
            boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
            Checkbox
          </h2>
          <p style={{ fontSize: 14, marginBottom: 16, color: "#444" }}>
            Generated from <code>_Atoms/Checkbox base tokenized</code>
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <AtomsCheckboxBaseTokenized Variant="Unselected" State="Default" />
              <span style={{ fontSize: 14, color: "#111" }}>Unselected - Default</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <AtomsCheckboxBaseTokenized Variant="Selected" State="Default" />
              <span style={{ fontSize: 14, color: "#111" }}>Selected - Default</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <AtomsCheckboxBaseTokenized Variant="Indeterminate" State="Default" />
              <span style={{ fontSize: 14, color: "#111" }}>Indeterminate - Default</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <AtomsCheckboxBaseTokenized Variant="Selected" State="Hover" />
              <span style={{ fontSize: 14, color: "#111" }}>Selected - Hover</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <AtomsCheckboxBaseTokenized Variant="Selected" State="Focus" />
              <span style={{ fontSize: 14, color: "#111" }}>Selected - Focus</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <AtomsCheckboxBaseTokenized Variant="Selected" State="Disabled" />
              <span style={{ fontSize: 14, color: "#999" }}>Selected - Disabled</span>
            </div>
            <hr style={{ margin: "16px 0", border: "none", borderTop: "1px solid #eee" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: "#111" }}>
                Interactive example
              </span>
              <InteractiveCheckbox label="Click me" />
            </div>
          </div>
        </section>

        {/* Button Component Section */}
        <section
          style={{
            padding: 24,
            borderRadius: 12,
            background: "white",
            boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
            Button
          </h2>
          <p style={{ fontSize: 14, marginBottom: 16, color: "#444" }}>
            Generated from <code>Button Tokenized</code>
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Primary Hierarchy */}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12, color: "#111" }}>
                Primary
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <AtomsButtonTokenized hierarchy="Primary" size="Lg" state="Default" leadingIcon={<PlusIcon size={16} />} trailingIcon={<DropdownIcon size={16} />}>
                    Button
                  </AtomsButtonTokenized>
                  <span style={{ fontSize: 14, color: "#111" }}>Default (leading + trailing icons)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <AtomsButtonTokenized hierarchy="Primary" size="Lg" state="Hover">
                    Button text
                  </AtomsButtonTokenized>
                  <span style={{ fontSize: 14, color: "#111" }}>Hover</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <AtomsButtonTokenized hierarchy="Primary" size="Lg" state="Focus">
                    Button text
                  </AtomsButtonTokenized>
                  <span style={{ fontSize: 14, color: "#111" }}>Focus</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <AtomsButtonTokenized hierarchy="Primary" size="Lg" state="Disabled">
                    Button text
                  </AtomsButtonTokenized>
                  <span style={{ fontSize: 14, color: "#999" }}>Disabled</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <AtomsButtonTokenized hierarchy="Primary" size="Lg" state="On click">
                    Button text
                  </AtomsButtonTokenized>
                  <span style={{ fontSize: 14, color: "#111" }}>On click</span>
                </div>
              </div>
            </div>

            {/* Secondary Hierarchy */}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12, color: "#111" }}>
                Secondary
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <AtomsButtonTokenized hierarchy="Secondary" size="Lg" state="Default">
                    Button text
                  </AtomsButtonTokenized>
                  <span style={{ fontSize: 14, color: "#111" }}>Default</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <AtomsButtonTokenized hierarchy="Secondary" size="Lg" state="Hover">
                    Button text
                  </AtomsButtonTokenized>
                  <span style={{ fontSize: 14, color: "#111" }}>Hover</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <AtomsButtonTokenized hierarchy="Secondary" size="Lg" state="Focus">
                    Button text
                  </AtomsButtonTokenized>
                  <span style={{ fontSize: 14, color: "#111" }}>Focus</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <AtomsButtonTokenized hierarchy="Secondary" size="Lg" state="Disabled">
                    Button text
                  </AtomsButtonTokenized>
                  <span style={{ fontSize: 14, color: "#999" }}>Disabled</span>
                </div>
              </div>
            </div>

            {/* Icon Only Variants */}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12, color: "#111" }}>
                Icon Only Variants
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <AtomsButtonTokenized variant="Icon only" hierarchy="Primary" size="Lg" state="Default" leadingIcon={<PlusIcon size={16} />} />
                  <AtomsButtonTokenized variant="Icon only" hierarchy="Primary" size="Lg" state="Hover" leadingIcon={<PlusIcon size={16} />} />
                  <AtomsButtonTokenized variant="Icon only" hierarchy="Primary" size="Lg" state="Focus" leadingIcon={<PlusIcon size={16} />} />
                  <AtomsButtonTokenized variant="Icon only" hierarchy="Primary" size="Lg" state="Disabled" leadingIcon={<PlusIcon size={16} />} />
                  <AtomsButtonTokenized variant="Icon only" hierarchy="Primary" size="Lg" state="On click" leadingIcon={<PlusIcon size={16} />} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <AtomsButtonTokenized variant="Icon only" hierarchy="Secondary" size="Lg" state="Default" leadingIcon={<EllipsisIcon size={16} />} />
                  <AtomsButtonTokenized variant="Icon only" hierarchy="Secondary" size="Lg" state="Hover" leadingIcon={<EllipsisIcon size={16} />} />
                  <AtomsButtonTokenized variant="Icon only" hierarchy="Secondary" size="Lg" state="Focus" leadingIcon={<EllipsisIcon size={16} />} />
                  <AtomsButtonTokenized variant="Icon only" hierarchy="Secondary" size="Lg" state="Disabled" leadingIcon={<EllipsisIcon size={16} />} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <AtomsButtonTokenized variant="Icon only" hierarchy="Primary" size="Lg" state="Default" leadingIcon={<PlusIcon size={16} />} />
                  <AtomsButtonTokenized variant="Icon only" hierarchy="Primary" size="Sm" state="Default" leadingIcon={<PlusIcon size={13} />} />
                  <AtomsButtonTokenized variant="Icon only" hierarchy="Primary" size="XS" state="Default" leadingIcon={<PlusIcon size={9} />} />
                  <span style={{ fontSize: 14, color: "#111" }}>Primary - Lg, Sm, XS</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <AtomsButtonTokenized variant="Icon only" hierarchy="Secondary" size="Lg" state="Default" leadingIcon={<EllipsisIcon size={16} />} />
                  <AtomsButtonTokenized variant="Icon only" hierarchy="Secondary" size="Sm" state="Default" leadingIcon={<EllipsisIcon size={13} />} />
                  <AtomsButtonTokenized variant="Icon only" hierarchy="Secondary" size="XS" state="Default" leadingIcon={<EllipsisIcon size={9} />} />
                  <span style={{ fontSize: 14, color: "#111" }}>Secondary - Lg, Sm, XS</span>
                </div>
              </div>
            </div>

            {/* Filter Variant */}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12, color: "#111" }}>
                Filter Variant
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <AtomsButtonTokenized variant="Filter" hierarchy="Primary" size="Sm" state="Default" leadingIcon={<FilterIcon size={13} />}>
                    Button
                  </AtomsButtonTokenized>
                  <AtomsButtonTokenized variant="Filter" hierarchy="Primary" size="Sm" state="Hover" leadingIcon={<FilterIcon size={13} />}>
                    Button
                  </AtomsButtonTokenized>
                  <AtomsButtonTokenized variant="Filter" hierarchy="Primary" size="Sm" state="Focus" leadingIcon={<FilterIcon size={13} />}>
                    Button
                  </AtomsButtonTokenized>
                  <AtomsButtonTokenized variant="Filter" hierarchy="Primary" size="Sm" state="Selected" leadingIcon={<FilterIcon size={13} />}>
                    Button
                  </AtomsButtonTokenized>
                </div>
              </div>
            </div>

            {/* Size Variants */}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12, color: "#111" }}>
                Size Variants
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <AtomsButtonTokenized hierarchy="Primary" size="Lg" state="Default">
                  Large
                </AtomsButtonTokenized>
                <AtomsButtonTokenized hierarchy="Primary" size="Sm" state="Default">
                  Small
                </AtomsButtonTokenized>
              </div>
            </div>

            {/* Interactive Examples */}
            <hr style={{ margin: "16px 0", border: "none", borderTop: "1px solid #eee" }} />
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12, color: "#111" }}>
                Interactive examples
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <InteractiveButton label="Primary Button" hierarchy="Primary" size="Lg" />
                  <span style={{ fontSize: 14, color: "#111" }}>Hover, focus, click to interact</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <InteractiveButton label="Secondary Button" hierarchy="Secondary" size="Lg" />
                  <span style={{ fontSize: 14, color: "#111" }}>Hover, focus, click to interact</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <InteractiveButton label="Disabled" hierarchy="Primary" size="Lg" disabled />
                  <span style={{ fontSize: 14, color: "#999" }}>Disabled state</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
