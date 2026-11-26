import type {
  District,
  FuelType,
  Role,
  Transmission,
  VehicleCategory,
  VehicleStatus,
} from "@prisma/client";

export const BRAND = {
  name: "SKA Vehicle Intelligence",
  short: "SKA-VI",
  owner: "Syed Kashif Ali",
  description: "Karachi Vehicle Data & Analytics Platform",
  tagline: "Complete Vehicle Intelligence. One Platform.",
} as const;

export const CATEGORY_LABELS: Record<VehicleCategory, string> = {
  CAR: "Car",
  SUV: "SUV",
  MOTORCYCLE: "Motorcycle",
  TRUCK: "Truck",
  BUS: "Bus",
  VAN: "Van",
  RICKSHAW: "Rickshaw",
  COMMERCIAL: "Commercial Vehicle",
  OTHER: "Other",
};

/** Categories counted as "commercial" for KPI purposes. */
export const COMMERCIAL_CATEGORIES: VehicleCategory[] = ["TRUCK", "BUS", "VAN", "COMMERCIAL"];

export const FUEL_LABELS: Record<FuelType, string> = {
  PETROL: "Petrol",
  DIESEL: "Diesel",
  CNG: "CNG",
  LPG: "LPG",
  HYBRID: "Hybrid",
  ELECTRIC: "Electric",
  OTHER: "Other",
};

export const TRANSMISSION_LABELS: Record<Transmission, string> = {
  MANUAL: "Manual",
  AUTOMATIC: "Automatic",
  CVT: "CVT",
  AMT: "AMT",
  OTHER: "Other",
};

export const STATUS_LABELS: Record<VehicleStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  TRANSFERRED: "Transferred",
  SCRAPPED: "Scrapped",
  STOLEN: "Reported Stolen",
  UNKNOWN: "Unknown",
};

export const DISTRICT_LABELS: Record<District, string> = {
  KARACHI_SOUTH: "Karachi South",
  KARACHI_EAST: "Karachi East",
  KARACHI_WEST: "Karachi West",
  KARACHI_CENTRAL: "Karachi Central",
  KORANGI: "Korangi",
  MALIR: "Malir",
  KEAMARI: "Keamari",
};

export const DISTRICTS = Object.keys(DISTRICT_LABELS) as District[];

/**
 * Approximate district reference points (lat, lng) used only to position
 * map markers. These are not administrative boundaries.
 */
export const DISTRICT_CENTROIDS: Record<District, [number, number]> = {
  KARACHI_SOUTH: [24.848, 67.025],
  KARACHI_EAST: [24.915, 67.095],
  KARACHI_WEST: [24.963, 66.985],
  KARACHI_CENTRAL: [24.945, 67.055],
  KORANGI: [24.835, 67.135],
  MALIR: [24.945, 67.215],
  KEAMARI: [24.875, 66.925],
};

/**
 * Starter list of well-known localities per district (reference data only,
 * editable). Imports may introduce additional areas automatically.
 */
export const SEED_AREAS: Record<District, string[]> = {
  KARACHI_SOUTH: ["Saddar", "Clifton", "Defence (DHA)", "Lyari", "Garden", "Civil Lines", "Kharadar", "Mithadar"],
  KARACHI_EAST: ["Gulshan-e-Iqbal", "Gulistan-e-Jauhar", "Jamshed Town", "PECHS", "Ferozabad", "Gulzar-e-Hijri", "Scheme 33"],
  KARACHI_CENTRAL: ["North Nazimabad", "Nazimabad", "Gulberg", "Federal B Area", "Liaquatabad", "New Karachi", "North Karachi"],
  KARACHI_WEST: ["Orangi Town", "Manghopir", "Mominabad", "Ittehad Town"],
  KORANGI: ["Korangi", "Landhi", "Shah Faisal Colony", "Model Colony"],
  MALIR: ["Malir", "Malir Cantonment", "Shah Latif Town", "Bin Qasim", "Gadap", "Ibrahim Hyderi"],
  KEAMARI: ["Keamari", "Baldia Town", "SITE", "Mauripur", "Manora"],
};

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Administrator",
  DATA_MANAGER: "Data Manager",
  VIEWER: "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  SUPER_ADMIN: "Complete system control, including administrators and system data purges.",
  ADMIN: "Manages users (below admin), all vehicle records, imports and audit logs.",
  DATA_MANAGER: "Creates, edits, imports and exports vehicle records.",
  VIEWER: "Read-only access to dashboards, search, analytics and exports.",
};

export const COMMON_COLORS = [
  "White", "Black", "Silver", "Grey", "Red", "Blue", "Green", "Maroon",
  "Beige", "Brown", "Gold", "Yellow", "Orange",
];

export const COMMON_BODY_TYPES = [
  "Sedan", "Hatchback", "Crossover", "SUV", "Pickup", "Mini Van", "Van",
  "Coaster", "Bus", "Truck", "Trailer", "Standard", "Sports", "Scooter", "Loader",
];

/** Data source value used for clearly-labelled synthetic demo records. */
export const SYNTHETIC_SOURCE = "SYNTHETIC DEMO DATA — NOT REAL";
