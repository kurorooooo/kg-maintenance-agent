export type Family = "asset" | "material" | "problem" | "action" | "manual";

export const LABEL_FAMILY: Record<string, Family> = {
  Line: "asset",
  Equipment: "asset",
  Model: "asset",
  Component: "material",
  Part: "material",
  Supplier: "material",
  FailureMode: "problem",
  Symptom: "problem",
  WorkOrder: "action",
  Procedure: "action",
  Technician: "action",
  Chunk: "manual",
};

export const FAMILY_COLOR: Record<Family, string> = {
  asset: "var(--asset)",
  material: "var(--material)",
  problem: "var(--problem)",
  action: "var(--action)",
  manual: "var(--manual)",
};

export function colorFor(label: string): string {
  return FAMILY_COLOR[LABEL_FAMILY[label] ?? "asset"];
}

/** Short caption shown inside the graph. IDs for records, names for concepts. */
export function captionFor(label: string, props: Record<string, unknown>, locale: "en" | "ja"): string {
  const id = String(props.id ?? "");
  const name = locale === "en" && typeof props.nameEn === "string" && props.nameEn ? String(props.nameEn) : String(props.name ?? "");
  switch (label) {
    case "WorkOrder":
    case "Chunk":
      return id;
    case "Equipment":
    case "Model":
    case "Part":
    case "Procedure":
      return name ? `${id} ${name}` : id;
    default:
      return name || id;
  }
}
