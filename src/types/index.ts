// Comprehensive TypeScript Definitions for Krushi Seva Kendra System

export type OpeningBalanceType = "Credit" | "Debit";
export type MedicineType = "Liquid" | "Powder" | "Granules";
export type ScheduleTime = "Morning" | "Evening";
export type UserRole = "ADMIN" | "FARMER";

// General Masters
export interface ShopProfile {
  id: string;
  name: string;
  ownerName: string;
  tagline: string;
  mobile: string;
  whatsapp: string;
  email: string;
  address: string;
  licenseNumber?: string;
  fertilizerLicenseNumber?: string;
  pesticideLicenseNumber?: string;
  gstNumber?: string;
  logoUrl?: string;
}

export interface YearMaster {
  id: string;
  yearName: string; // e.g. "2026-27"
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface UnitMaster {
  id: string;
  unitName: string; // e.g. "Milliliter", "Gram", "Litre", "Kilogram"
  shortName: string; // e.g. "ml", "gm", "ltr", "kg"
}

export interface StateMaster {
  id: string;
  name: string;
}

export interface DistrictMaster {
  id: string;
  stateId: string;
  name: string;
}

export interface TalukaMaster {
  id: string;
  districtId: string;
  name: string;
}

export interface VillageMaster {
  id: string;
  talukaId: string;
  name: string;
}

// Medicine & Fertilizer Masters
export interface MedicineCompany {
  id: string;
  name: string;
}

export interface MedicineCategory {
  id: string;
  name: string; // Fungicide, Bactericides, Organic Insecticides, etc.
}

export interface Medicine {
  id: string;
  name: string;
  technicalContent?: string;
  type: MedicineType;
  companyId: string;
  companyName: string;
  categoryId: string;
  categoryName: string;
  unitId: string;
  unitShortName: string;
}

export interface Fertilizer {
  id: string;
  name: string; // 10:26:26, DAP, 12:61:00, Urea, etc.
  company: string;
  type: "Granular" | "Water Soluble" | "Liquid" | "Organic";
  unit: string; // kg, bag, ltr
  notes?: string;
}

// Master Schedules (Templates)
export interface MasterSprayItem {
  id: string;
  day: number; // e.g., 4, 10
  time: ScheduleTime; // Morning / Evening
  medicineId: string;
  medicineName: string;
  quantity: string; // e.g. "20"
  unit: string; // ml, gm, ltr, kg
  waterQuantity: string; // e.g. "15 Litres", "200 Litres (1 Drum)"
  note: string; // instructions
}

export interface MasterFertilizerItem {
  id: string;
  day: number; // e.g., 1 (Basal), 15
  stage: string; // Basal, Vegetative, Flowering, Fruit setting, etc.
  fertilizerId: string;
  fertilizerName: string;
  quantity: string; // e.g. "50"
  unit: string; // kg, bag
  applicationMethod: string; // Drip, Soil Drenching, Broadcasting
  waterQuantity?: string;
  note: string;
}

export interface MasterCropSchedule {
  cropName: string; // Sugarcane, Tomato, Ginger, etc.
  spraySchedules: MasterSprayItem[];
  fertilizerSchedules: MasterFertilizerItem[];
}

// Farmer & Plot Details
export interface PersonalizedSprayItem {
  id: string;
  masterScheduleItemId?: string;
  day: number;
  scheduledDate?: string;
  time: ScheduleTime;
  medicineId: string;
  medicineName: string;
  quantity: string;
  unit: string;
  waterQuantity: string;
  note: string;
  isCompleted?: boolean;
}

export interface PersonalizedFertilizerItem {
  id: string;
  masterScheduleItemId?: string;
  day: number;
  scheduledDate?: string;
  stage: string;
  fertilizerId: string;
  fertilizerName: string;
  quantity: string;
  unit: string;
  applicationMethod: string;
  waterQuantity?: string;
  note: string;
  isCompleted?: boolean;
}

export interface Plot {
  id: string;
  plotName: string; // e.g. "Plot 1 - North Side"
  cropName: string;
  sowingDate: string; // YYYY-MM-DD
  areaAcre: number;
  areaGuntha: number;
  totalGuntha: number; // (Acre * 40) + Guntha
  spraySchedule: PersonalizedSprayItem[];
  fertilizerSchedule: PersonalizedFertilizerItem[];
}

export interface Farmer {
  id: string;
  name: string;
  mobile: string;
  whatsapp: string;
  openingBalanceType: OpeningBalanceType; // Credit / Debit
  openingBalance: number;
  registrationDate: string; // YYYY-MM-DD
  // Location
  state: string;
  district: string;
  taluka: string;
  village: string;
  // Login
  username: string;
  passwordHash: string;
  plainPassword?: string;
  isActive: boolean;
  plots: Plot[];
}

export type ScheduleProgressStatus = "ACTIVE" | "COMPLETED";

export interface ScheduleProgress {
  id: string;
  farmerId: string;
  plotId: string;
  cropId: string;
  masterScheduleId: string;
  totalDaysReleased: number;
  lastDeliveredDay: number;
  currentDay: number;
  scheduleStartDate: string;
  scheduleEndDate: string;
  status: ScheduleProgressStatus;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type ScheduleDayStatus = "COMPLETED" | "TODAY" | "UPCOMING";

export interface ScheduleTimelineDay {
  day: number;
  date: string;
  status: ScheduleDayStatus;
  sprays: PersonalizedSprayItem[];
  fertilizers: PersonalizedFertilizerItem[];
}

export interface PlotScheduleTimeline {
  plot: Pick<
    Plot,
    "id" | "plotName" | "cropName" | "sowingDate" | "areaAcre" | "areaGuntha" | "totalGuntha"
  >;
  progress: ScheduleProgress | null;
  currentDate: string;
  currentDay: number;
  totalDaysReleased: number;
  remainingDays: number;
  status: "NOT_RELEASED" | ScheduleProgressStatus;
  days: ScheduleTimelineDay[];
}

export interface ScheduleExtensionHistory {
  id: string;
  farmerId: string;
  plotId: string;
  cropId: string;
  masterScheduleId: string;
  previousTotalDays: number;
  newTotalDays: number;
  releasedStartDay: number;
  releasedEndDay: number;
  actionType: "INITIAL" | "EXTENSION";
  createdAt: string;
  createdBy: string;
}

export type FarmDiaryActivityType =
  | "Spraying"
  | "Fertilizer Application"
  | "Pesticide Application"
  | "Irrigation"
  | "Labour"
  | "Seeds"
  | "Machinery"
  | "Harvesting"
  | "Other";

export interface FarmDiaryEntry {
  id: string;
  farmerId: string;
  plotId: string;
  cropName: string;
  date: string;
  season: string;
  activityType: FarmDiaryActivityType;
  description: string;
  productName: string;
  quantity: number | null;
  unit: string;
  labourCost: number;
  productCost: number;
  otherExpenses: number;
  totalExpense: number;
  notes: string;
  photoDataUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type MarketRateStatus = "DRAFT" | "PUBLISHED";

export interface MarketRate {
  id: string;
  cropName: string;
  cropVariety: string;
  state: string;
  district: string;
  marketName: string;
  minimumPrice: number;
  maximumPrice: number;
  modalPrice: number;
  arrivalQuantity: number | null;
  rateDate: string;
  status: MarketRateStatus;
  adminNotes: string;
  createdByAdmin: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser {
  email: string;
  passwordHash: string;
}

export interface DatabaseSchema {
  shop: ShopProfile;
  admin: AdminUser;
  years: YearMaster[];
  units: UnitMaster[];
  states: StateMaster[];
  districts: DistrictMaster[];
  talukas: TalukaMaster[];
  villages: VillageMaster[];
  medicineCompanies: MedicineCompany[];
  medicineCategories: MedicineCategory[];
  medicines: Medicine[];
  fertilizers: Fertilizer[];
  masterSchedules: Record<string, MasterCropSchedule>; // key: cropName
  farmers: Farmer[];
  scheduleProgress: ScheduleProgress[];
  scheduleExtensionHistory: ScheduleExtensionHistory[];
  farmDiaryEntries: FarmDiaryEntry[];
  marketRates: MarketRate[];
}
