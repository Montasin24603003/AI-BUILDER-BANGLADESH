import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { UnitSystem } from "@/types/plancheck";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDimensionCm(cm: number, unitSystem: UnitSystem = "metric"): string {
  if (unitSystem === "imperial") {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return feet > 0 ? `${feet}′ ${inches}″` : `${inches}″`;
  }
  if (cm >= 100) {
    return `${(cm / 100).toFixed(2)} m`;
  }
  return `${Math.round(cm)} cm`;
}

export function formatArea(sqm: number, unitSystem: UnitSystem = "metric"): string {
  if (unitSystem === "imperial") {
    const sqft = Math.round(sqm * 10.7639);
    return `${sqft.toLocaleString()} sq ft`;
  }
  return `${sqm.toLocaleString()} m²`;
}
