export const NAMIBIA_REGIONS = [
  "Khomas",
  "Erongo",
  "Otjozondjupa",
  "Oshana",
  "Ohangwena",
  "Omusati",
  "Oshikoto",
  "Kavango East",
  "Kavango West",
  "Zambezi",
  "Kunene",
  "Hardap",
  "||Karas",
  "Omaheke"
] as const;

export type NamibiaRegion = typeof NAMIBIA_REGIONS[number];

export const SERVICE_TYPES = [
  "Livestock",
  "Vegetables",
  "Crafts",
  "Services"
] as const;

export type ServiceType = typeof SERVICE_TYPES[number];
