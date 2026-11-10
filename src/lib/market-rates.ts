import { MarketRateStatus, MarketRateUnit } from "@/types";

export interface MarketRateInput {
  cropName: string;
  cropVariety: string;
  state: string;
  district: string;
  marketName: string;
  rateUnit: MarketRateUnit;
  minimumPrice: number;
  maximumPrice: number;
  modalPrice: number;
  arrivalQuantity: number | null;
  rateDate: string;
  status: MarketRateStatus;
  adminNotes: string;
}

export function isValidRateDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateMarketRateInput(
  value: unknown
): { input: MarketRateInput } | { error: string } {
  if (!value || typeof value !== "object") {
    return { error: "Market rate details are required." };
  }

  const data = value as Record<string, unknown>;
  const requiredText: Record<string, string> = {};
  const textFields = [
    ["cropName", "Crop name"],
    ["cropVariety", "Crop variety"],
    ["state", "State"],
    ["district", "District"],
  ] as const;
  for (const [field, label] of textFields) {
    const text = data[field];
    if (typeof text !== "string" || !text.trim()) {
      return { error: `${label} is required.` };
    }
    if (text.trim().length > 120) {
      return { error: `${label} must be 120 characters or fewer.` };
    }
    requiredText[field] = text.trim();
  }
  const marketName = data.marketName === undefined ? "" : data.marketName;
  if (typeof marketName !== "string" || marketName.trim().length > 120) {
    return { error: "Market name must be 120 characters or fewer." };
  }
  if (!isValidRateDate(data.rateDate)) {
    return { error: "Select a valid market rate date." };
  }
  if (data.rateUnit !== "KG" && data.rateUnit !== "TON") {
    return { error: "Select a price unit: kg or ton." };
  }

  const minimumPrice = data.minimumPrice;
  const maximumPrice = data.maximumPrice;
  const modalPrice = data.modalPrice;
  if (
    typeof minimumPrice !== "number" ||
    !Number.isFinite(minimumPrice) ||
    typeof maximumPrice !== "number" ||
    !Number.isFinite(maximumPrice) ||
    typeof modalPrice !== "number" ||
    !Number.isFinite(modalPrice) ||
    minimumPrice <= 0 ||
    maximumPrice < minimumPrice ||
    modalPrice < minimumPrice ||
    modalPrice > maximumPrice ||
    maximumPrice > 1_000_000_000
  ) {
    return { error: "Prices must be positive, and modal price must be between minimum and maximum." };
  }

  const arrivalQuantity = data.arrivalQuantity;
  if (
    arrivalQuantity !== null &&
    (typeof arrivalQuantity !== "number" ||
      !Number.isFinite(arrivalQuantity) ||
      arrivalQuantity < 0 ||
      arrivalQuantity > 1_000_000_000)
  ) {
    return { error: "Arrival quantity must be zero or a positive number." };
  }
  if (data.status !== "DRAFT" && data.status !== "PUBLISHED") {
    return { error: "Select whether to save this rate as a draft or publish it." };
  }
  if (typeof data.adminNotes !== "string" || data.adminNotes.length > 2000) {
    return { error: "Admin notes must be 2,000 characters or fewer." };
  }

  return {
    input: {
      cropName: requiredText.cropName,
      cropVariety: requiredText.cropVariety,
      state: requiredText.state,
      district: requiredText.district,
      marketName: marketName.trim(),
      rateUnit: data.rateUnit,
      minimumPrice,
      maximumPrice,
      modalPrice,
      arrivalQuantity,
      rateDate: data.rateDate,
      status: data.status,
      adminNotes: data.adminNotes.trim(),
    },
  };
}
