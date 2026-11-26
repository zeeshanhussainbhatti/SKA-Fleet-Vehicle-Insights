export const statusTone = (s: string) =>
  (s === "ACTIVE" ? "success" : s === "STOLEN" ? "danger" : s === "SCRAPPED" || s === "INACTIVE" ? "warning" : "neutral") as
    | "success"
    | "danger"
    | "warning"
    | "neutral";

export const importStatusTone = (s: string) =>
  (s === "COMPLETED" ? "success" : s === "FAILED" ? "danger" : s === "COMPLETED_WITH_ERRORS" ? "warning" : s === "VALIDATED" ? "primary" : "neutral") as
    | "success"
    | "danger"
    | "warning"
    | "primary"
    | "neutral";
