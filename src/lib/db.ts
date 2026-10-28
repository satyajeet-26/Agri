import fs from "fs";
import path from "path";
import {
  DatabaseSchema,
  Farmer,
  PersonalizedFertilizerItem,
  PersonalizedSprayItem,
} from "@/types";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const DB_FILE = path.join(DATA_DIR, "krushi_db.json");

// Initial Seed Data if file does not exist
const INITIAL_DATABASE: DatabaseSchema = {
  shop: {
    id: "shop-01",
    name: "Demo Krushi Seva Kendra",
    ownerName: "Demo Owner",
    tagline: "Agriculture Consultancy & Crop Advisory Demo",
    mobile: "",
    whatsapp: "",
    email: "contact@example.test",
    address: "Demo Address",
  },
  admin: {
    email: "admin@krushi.com",
    passwordHash: "admin123", // In production: bcrypt hashed
  },
  years: [
    { id: "yr-2627", yearName: "2026–27", startDate: "2026-04-01", endDate: "2027-03-31", isActive: true },
    { id: "yr-2728", yearName: "2027–28", startDate: "2027-04-01", endDate: "2028-03-31", isActive: false },
    { id: "yr-2829", yearName: "2028–29", startDate: "2028-04-01", endDate: "2029-03-31", isActive: false },
  ],
  units: [
    { id: "u-ml", unitName: "Milliliter", shortName: "ml" },
    { id: "u-ltr", unitName: "Litre", shortName: "ltr" },
    { id: "u-gm", unitName: "Gram", shortName: "gm" },
    { id: "u-kg", unitName: "Kilogram", shortName: "kg" },
    { id: "u-bag", unitName: "Bag (५० किगो बॅग)", shortName: "bag" },
  ],
  states: [],
  districts: [],
  talukas: [],
  villages: [],
  medicineCompanies: [
    { id: "mc-syngenta", name: "Syngenta India" },
    { id: "mc-bayer", name: "Bayer CropScience" },
    { id: "mc-upl", name: "UPL Limited" },
    { id: "mc-dhanuka", name: "Dhanuka Agritech" },
    { id: "mc-basf", name: "BASF India" },
    { id: "mc-fmc", name: "FMC India" },
    { id: "mc-sumitomo", name: "Sumitomo Chemical" },
  ],
  medicineCategories: [
    { id: "cat-fungicide", name: "Fungicide (बुरशीनाशक)" },
    { id: "cat-bactericide", name: "Bactericides (जीवाणूनाशक)" },
    { id: "cat-chem-insecticide", name: "Chemical Insecticides (रासायनिक कीटकनाशक)" },
    { id: "cat-org-insecticide", name: "Organic Insecticides (जैविक कीटकनाशक)" },
    { id: "cat-acaricide", name: "Acaricides (कोळीनाशक)" },
    { id: "cat-nematicide", name: "Nematicides (सूत्रकृमीनाशक)" },
    { id: "cat-org-fungicide", name: "Organic Fungicides (जैविक बुरशीनाशक)" },
    { id: "cat-hormone-nutrient", name: "Growth Hormones / Nutrients (टॉनिक / संजीवके)" },
  ],
  medicines: [
    {
      id: "med-01",
      name: "Score (Difenoconazole 25% EC)",
      type: "Liquid",
      companyId: "mc-syngenta",
      companyName: "Syngenta India",
      categoryId: "cat-fungicide",
      categoryName: "Fungicide (बुरशीनाशक)",
      unitId: "u-ml",
      unitShortName: "ml",
    },
    {
      id: "med-02",
      name: "Amistar Top (Azoxystrobin + Difenoconazole)",
      type: "Liquid",
      companyId: "mc-syngenta",
      companyName: "Syngenta India",
      categoryId: "cat-fungicide",
      categoryName: "Fungicide (बुरशीनाशक)",
      unitId: "u-ml",
      unitShortName: "ml",
    },
    {
      id: "med-03",
      name: "Confidor (Imidacloprid 17.8% SL)",
      type: "Liquid",
      companyId: "mc-bayer",
      companyName: "Bayer CropScience",
      categoryId: "cat-chem-insecticide",
      categoryName: "Chemical Insecticides (रासायनिक कीटकनाशक)",
      unitId: "u-ml",
      unitShortName: "ml",
    },
    {
      id: "med-04",
      name: "Coragen (Chlorantraniliprole 18.5% SC)",
      type: "Liquid",
      companyId: "mc-fmc",
      companyName: "FMC India",
      categoryId: "cat-chem-insecticide",
      categoryName: "Chemical Insecticides (रासायनिक कीटकनाशक)",
      unitId: "u-ml",
      unitShortName: "ml",
    },
    {
      id: "med-05",
      name: "Nativo (Tebuconazole + Trifloxystrobin)",
      type: "Powder",
      companyId: "mc-bayer",
      companyName: "Bayer CropScience",
      categoryId: "cat-fungicide",
      categoryName: "Fungicide (बुरशीनाशक)",
      unitId: "u-gm",
      unitShortName: "gm",
    },
    {
      id: "med-06",
      name: "Saaf (Carbendazim 12% + Mancozeb 63% WP)",
      type: "Powder",
      companyId: "mc-upl",
      companyName: "UPL Limited",
      categoryId: "cat-fungicide",
      categoryName: "Fungicide (बुरशीनाशक)",
      unitId: "u-gm",
      unitShortName: "gm",
    },
    {
      id: "med-07",
      name: "Neem Oil 10000 PPM",
      type: "Liquid",
      companyId: "mc-dhanuka",
      companyName: "Dhanuka Agritech",
      categoryId: "cat-org-insecticide",
      categoryName: "Organic Insecticides (जैविक कीटकनाशक)",
      unitId: "u-ml",
      unitShortName: "ml",
    },
    {
      id: "med-08",
      name: "Gibberellic Acid 0.001%",
      type: "Liquid",
      companyId: "mc-sumitomo",
      companyName: "Sumitomo Chemical",
      categoryId: "cat-hormone-nutrient",
      categoryName: "Growth Hormones / Nutrients (टॉनिक / संजीवके)",
      unitId: "u-ml",
      unitShortName: "ml",
    },
  ],
  fertilizers: [
    {
      id: "fert-01",
      name: "10:26:26 (Mahadhan / IFFCO)",
      company: "Mahadhan",
      type: "Granular",
      unit: "kg",
      notes: "Basal application for root & early growth",
    },
    {
      id: "fert-02",
      name: "DAP (18:46:00)",
      company: "IFFCO",
      type: "Granular",
      unit: "kg",
      notes: "Phosphorus rich for early root establishment",
    },
    {
      id: "fert-03",
      name: "12:61:00 (Mono Ammonium Phosphate)",
      company: "Mahadhan",
      type: "Water Soluble",
      unit: "kg",
      notes: "Early vegetative growth & roots through drip",
    },
    {
      id: "fert-04",
      name: "00:52:34 (MKP)",
      company: "Haifa / Mahadhan",
      type: "Water Soluble",
      unit: "kg",
      notes: "Flowering & bud development stage",
    },
    {
      id: "fert-05",
      name: "13:00:45 (Potassium Nitrate)",
      company: "Mahadhan",
      type: "Water Soluble",
      unit: "kg",
      notes: "Fruit development and weight increase stage",
    },
    {
      id: "fert-06",
      name: "Calcium Nitrate + Boron",
      company: "YaraLiva",
      type: "Water Soluble",
      unit: "kg",
      notes: "Prevents fruit cracking and blossom end rot",
    },
  ],
  masterSchedules: {
    "Tomato": {
      cropName: "Tomato",
      spraySchedules: [
        {
          id: "msp-tom-1",
          day: 4,
          time: "Morning",
          medicineId: "med-06",
          medicineName: "Saaf (Carbendazim + Mancozeb)",
          quantity: "30",
          unit: "gm",
          waterQuantity: "15 Litres",
          note: "Preventive spray against damping-off and seedling blight. Spray evenly.",
        },
        {
          id: "msp-tom-2",
          day: 10,
          time: "Morning",
          medicineId: "med-03",
          medicineName: "Confidor (Imidacloprid)",
          quantity: "8",
          unit: "ml",
          waterQuantity: "15 Litres",
          note: "Control sucking pests (thrips, aphids, whitefly). Ensure cool morning timing.",
        },
        {
          id: "msp-tom-3",
          day: 18,
          time: "Evening",
          medicineId: "med-01",
          medicineName: "Score (Difenoconazole)",
          quantity: "15",
          unit: "ml",
          waterQuantity: "15 Litres",
          note: "Control early blight and leaf spot. Use silicon sticker 5ml.",
        },
        {
          id: "msp-tom-4",
          day: 28,
          time: "Morning",
          medicineId: "med-04",
          medicineName: "Coragen (Chlorantraniliprole)",
          quantity: "6",
          unit: "ml",
          waterQuantity: "15 Litres",
          note: "Target tomato fruit borer and pinworm early instar larvae.",
        },
        {
          id: "msp-tom-5",
          day: 38,
          time: "Morning",
          medicineId: "med-05",
          medicineName: "Nativo (Tebuconazole + Trifloxystrobin)",
          quantity: "12",
          unit: "gm",
          waterQuantity: "15 Litres",
          note: "Protect flowering stage and early fruit setting against powdery mildew and blight.",
        },
      ],
      fertilizerSchedules: [
        {
          id: "mfr-tom-1",
          day: 1,
          stage: "Basal (लागवड वेळ)",
          fertilizerId: "fert-01",
          fertilizerName: "10:26:26",
          quantity: "50",
          unit: "kg",
          applicationMethod: "Broadcasting in bed (बेसल डोस)",
          note: "Mix well with organic manure/compost before bed making.",
        },
        {
          id: "mfr-tom-2",
          day: 10,
          stage: "Early Vegetative",
          fertilizerId: "fert-03",
          fertilizerName: "12:61:00 (MAP)",
          quantity: "3",
          unit: "kg",
          applicationMethod: "Drip Irrigation (ठिबकद्वारे)",
          note: "Give through drip over 2 hours. Enhances rapid root growth.",
        },
        {
          id: "mfr-tom-3",
          day: 25,
          stage: "Flowering Stage",
          fertilizerId: "fert-04",
          fertilizerName: "00:52:34 (MKP)",
          quantity: "4",
          unit: "kg",
          applicationMethod: "Drip Irrigation",
          note: "Promotes profuse flowering and avoids premature flower drop.",
        },
        {
          id: "mfr-tom-4",
          day: 40,
          stage: "Fruit Development",
          fertilizerId: "fert-05",
          fertilizerName: "13:00:45 (Potassium Nitrate)",
          quantity: "5",
          unit: "kg",
          applicationMethod: "Drip Irrigation",
          note: "Helps uniform fruit enlargement and bright red color development.",
        },
      ],
    },
    "Sugarcane": {
      cropName: "Sugarcane",
      spraySchedules: [
        {
          id: "msp-sug-1",
          day: 20,
          time: "Morning",
          medicineId: "med-03",
          medicineName: "Confidor (Imidacloprid)",
          quantity: "10",
          unit: "ml",
          waterQuantity: "15 Litres",
          note: "Control early shoot borer and black aphid.",
        },
        {
          id: "msp-sug-2",
          day: 45,
          time: "Evening",
          medicineId: "med-04",
          medicineName: "Coragen (Chlorantraniliprole)",
          quantity: "60",
          unit: "ml",
          waterQuantity: "200 Litres",
          note: "Drenching / spray near root zone for long duration shoot borer protection.",
        },
      ],
      fertilizerSchedules: [
        {
          id: "mfr-sug-1",
          day: 1,
          stage: "Basal Dose (लागवड)",
          fertilizerId: "fert-02",
          fertilizerName: "DAP (18:46:00)",
          quantity: "100",
          unit: "kg",
          applicationMethod: "Soil placement in furrow",
          note: "Apply along with 50 kg Potash and 100 kg Neem cake.",
        },
        {
          id: "mfr-sug-2",
          day: 45,
          stage: "Tillering Stage (फुटवे)",
          fertilizerId: "fert-01",
          fertilizerName: "10:26:26",
          quantity: "100",
          unit: "kg",
          applicationMethod: "Broadcasting & Earthing up (बाळबांधणी)",
          note: "Provide adequate irrigation after application.",
        },
      ],
    },
    "Ginger": {
      cropName: "Ginger",
      spraySchedules: [
        {
          id: "msp-gin-1",
          day: 15,
          time: "Morning",
          medicineId: "med-06",
          medicineName: "Saaf (Carbendazim + Mancozeb)",
          quantity: "35",
          unit: "gm",
          waterQuantity: "15 Litres",
          note: "Preventive rhizome rot (कंदकुज) spray / drenching.",
        },
        {
          id: "msp-gin-2",
          day: 35,
          time: "Evening",
          medicineId: "med-02",
          medicineName: "Amistar Top",
          quantity: "15",
          unit: "ml",
          waterQuantity: "15 Litres",
          note: "Protection against leaf spot and bacterial soft rot.",
        },
      ],
      fertilizerSchedules: [
        {
          id: "mfr-gin-1",
          day: 1,
          stage: "Basal Bed",
          fertilizerId: "fert-01",
          fertilizerName: "10:26:26",
          quantity: "100",
          unit: "kg",
          applicationMethod: "Bed preparation",
          note: "Mix with 2 tons decomposed cow dung manure.",
        },
        {
          id: "mfr-gin-2",
          day: 30,
          stage: "Sprouting & Root Growth",
          fertilizerId: "fert-03",
          fertilizerName: "12:61:00",
          quantity: "5",
          unit: "kg",
          applicationMethod: "Drip Irrigation",
          note: "Weekly fertigation for strong rhizome anchor.",
        },
      ],
    },
  },
  farmers: [
    {
      id: "fm-001",
      name: "Demo Farmer One",
      mobile: "0000000000",
      whatsapp: "",
      openingBalanceType: "Debit",
      openingBalance: 4500, // ₹4500 udhari
      registrationDate: "2026-09-10",
      state: "",
      district: "",
      taluka: "",
      village: "",
      username: "ramesh",
      passwordHash: "1234",
      plainPassword: "1234",
      isActive: true,
      plots: [
        {
          id: "plt-001-1",
          plotName: "Plot 1 (विहिरीचे रान)",
          cropName: "Sugarcane",
          sowingDate: "2026-09-15",
          areaAcre: 2,
          areaGuntha: 0,
          totalGuntha: 80,
          spraySchedule: [
            {
              id: "psp-001-1",
              day: 20,
              time: "Morning",
              medicineId: "med-03",
              medicineName: "Confidor (Imidacloprid)",
              quantity: "10",
              unit: "ml",
              waterQuantity: "15 Litres",
              note: "Control early shoot borer. Spray directly along rows.",
              isCompleted: true,
            },
            {
              id: "psp-001-2",
              day: 45,
              time: "Evening",
              medicineId: "med-04",
              medicineName: "Coragen (Chlorantraniliprole)",
              quantity: "60",
              unit: "ml",
              waterQuantity: "200 Litres",
              note: "Drenching near root zone for long-term borer protection.",
              isCompleted: false,
            },
          ],
          fertilizerSchedule: [
            {
              id: "pfr-001-1",
              day: 1,
              stage: "Basal Dose (लागवड)",
              fertilizerId: "fert-02",
              fertilizerName: "DAP (18:46:00)",
              quantity: "100",
              unit: "kg",
              applicationMethod: "Soil placement in furrow",
              note: "Applied with potash.",
              isCompleted: true,
            },
            {
              id: "pfr-001-2",
              day: 45,
              stage: "Tillering Stage (फुटवे)",
              fertilizerId: "fert-01",
              fertilizerName: "10:26:26",
              quantity: "100",
              unit: "kg",
              applicationMethod: "Broadcasting & Earthing up (बाळबांधणी)",
              note: "Water immediately after applying.",
              isCompleted: false,
            },
          ],
        },
        {
          id: "plt-001-2",
          plotName: "Plot 2 (घराशेजारी)",
          cropName: "Ginger",
          sowingDate: "2026-10-01",
          areaAcre: 0,
          areaGuntha: 20,
          totalGuntha: 20,
          spraySchedule: [
            {
              id: "psp-001-3",
              day: 15,
              time: "Morning",
              medicineId: "med-06",
              medicineName: "Saaf (Carbendazim + Mancozeb)",
              quantity: "35",
              unit: "gm",
              waterQuantity: "15 Litres",
              note: "Preventive rhizome rot drenching.",
              isCompleted: true,
            },
            {
              id: "psp-001-4",
              day: 35,
              time: "Evening",
              medicineId: "med-02",
              medicineName: "Amistar Top",
              quantity: "15",
              unit: "ml",
              waterQuantity: "15 Litres",
              note: "Special customized medicine advised for this plot due to humidity.",
              isCompleted: false,
            },
          ],
          fertilizerSchedule: [
            {
              id: "pfr-001-3",
              day: 1,
              stage: "Basal Bed",
              fertilizerId: "fert-01",
              fertilizerName: "10:26:26",
              quantity: "50",
              unit: "kg",
              applicationMethod: "Bed preparation",
              note: "Applied with vermicompost.",
              isCompleted: true,
            },
          ],
        },
      ],
    },
    {
      id: "fm-002",
      name: "Demo Farmer Two",
      mobile: "0000000000",
      whatsapp: "",
      openingBalanceType: "Credit",
      openingBalance: 1200,
      registrationDate: "2026-10-18",
      state: "",
      district: "",
      taluka: "",
      village: "",
      username: "suresh",
      passwordHash: "1234",
      plainPassword: "1234",
      isActive: true,
      plots: [
        {
          id: "plt-002-1",
          plotName: "Plot 1 (टोमॅटो मळा)",
          cropName: "Tomato",
          sowingDate: "2026-10-18",
          areaAcre: 1,
          areaGuntha: 20,
          totalGuntha: 60,
          spraySchedule: [
            {
              id: "psp-002-1",
              day: 4,
              time: "Morning",
              medicineId: "med-06",
              medicineName: "Saaf (Carbendazim + Mancozeb)",
              quantity: "30",
              unit: "gm",
              waterQuantity: "15 Litres",
              note: "Preventive damping-off spray.",
              isCompleted: true,
            },
            {
              id: "psp-002-2",
              day: 10,
              time: "Morning",
              medicineId: "med-03",
              medicineName: "Confidor (Imidacloprid)",
              quantity: "8",
              unit: "ml",
              waterQuantity: "15 Litres",
              note: "Control sucking pests on young shoots.",
              isCompleted: false,
            },
            {
              id: "psp-002-3",
              day: 18,
              time: "Evening",
              medicineId: "med-01",
              medicineName: "Score (Difenoconazole)",
              quantity: "15",
              unit: "ml",
              waterQuantity: "15 Litres",
              note: "Early blight protection.",
              isCompleted: false,
            },
          ],
          fertilizerSchedule: [
            {
              id: "pfr-002-1",
              day: 1,
              stage: "Basal (लागवड वेळ)",
              fertilizerId: "fert-01",
              fertilizerName: "10:26:26",
              quantity: "50",
              unit: "kg",
              applicationMethod: "Broadcasting in bed",
              note: "Base fertilizer.",
              isCompleted: true,
            },
            {
              id: "pfr-002-2",
              day: 10,
              stage: "Early Vegetative",
              fertilizerId: "fert-03",
              fertilizerName: "12:61:00 (MAP)",
              quantity: "3",
              unit: "kg",
              applicationMethod: "Drip Irrigation",
              note: "Give through drip over 2 hours.",
              isCompleted: false,
            },
          ],
        },
      ],
    },
  ],
};

const SUPABASE_TABLE = "krushi_app_state";

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url && !serviceRoleKey) {
    return null;
  }
  if (!url || !serviceRoleKey) {
    const missingVariables = [
      !url && "SUPABASE_URL",
      !serviceRoleKey && "SUPABASE_SERVICE_ROLE_KEY",
    ].filter(Boolean);
    console.error("Supabase configuration is incomplete.", { missingVariables });
    throw new Error(`Missing Supabase environment variable(s): ${missingVariables.join(", ")}.`);
  }

  return { url, serviceRoleKey };
}

function cloneInitialDatabase(): DatabaseSchema {
  return JSON.parse(JSON.stringify(INITIAL_DATABASE)) as DatabaseSchema;
}

export function toPublicFarmer(
  farmer: Farmer
): Omit<Farmer, "passwordHash" | "plainPassword"> {
  const publicFarmer = { ...farmer };
  Reflect.deleteProperty(publicFarmer, "passwordHash");
  Reflect.deleteProperty(publicFarmer, "plainPassword");
  return publicFarmer;
}

function addMissingDemoFarmers(database: DatabaseSchema): boolean {
  const demoUsernames = new Set(["ramesh", "suresh"]);
  const missingFarmers = INITIAL_DATABASE.farmers.filter(
    (farmer) =>
      demoUsernames.has(farmer.username.toLowerCase()) &&
      !database.farmers.some(
        (existingFarmer) =>
          existingFarmer.username.trim().toLowerCase() === farmer.username.toLowerCase()
      )
  );

  if (missingFarmers.length === 0) {
    return false;
  }

  const demoFarmers = JSON.parse(
    JSON.stringify(missingFarmers)
  ) as DatabaseSchema["farmers"];
  const existingIds = new Set(database.farmers.map((farmer) => farmer.id));

  for (const farmer of demoFarmers) {
    if (existingIds.has(farmer.id)) {
      const baseId = `fm-demo-${farmer.username.toLowerCase()}`;
      let candidateId = baseId;
      let suffix = 2;
      while (existingIds.has(candidateId)) {
        candidateId = `${baseId}-${suffix++}`;
      }
      farmer.id = candidateId;
    }

    existingIds.add(farmer.id);
    database.farmers.push(farmer);
  }

  return true;
}

async function supabaseRequest(
  url: string,
  serviceRoleKey: string,
  pathAndQuery: string,
  init?: RequestInit
): Promise<Response> {
  const method = init?.method || "GET";
  const resource = `/rest/v1/${pathAndQuery.split("?")[0]}`;
  let response: Response;

  try {
    response = await fetch(`${url}/rest/v1/${pathAndQuery}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      ...(init?.headers || {}),
    },
    });
  } catch (error: unknown) {
    const name = error instanceof Error ? error.name : "UnknownError";
    const message = error instanceof Error ? error.message : "Unknown network error";
    console.error("Supabase REST request did not receive a response.", {
      method,
      resource,
      errorName: name,
      errorMessage: message,
    });
    throw new Error(`Supabase REST request failed before receiving a response (${name}).`);
  }

  if (!response.ok) {
    const responseText = await response.text();
    let responseError: {
      code?: unknown;
      message?: unknown;
      hint?: unknown;
    } = {};
    try {
      responseError = JSON.parse(responseText);
    } catch {
      responseError = { message: responseText.slice(0, 500) };
    }

    console.error("Supabase REST request failed.", {
      method,
      resource,
      status: response.status,
      code: typeof responseError.code === "string" ? responseError.code : undefined,
      message:
        typeof responseError.message === "string"
          ? responseError.message
          : "Supabase returned an unrecognized error response.",
      hint: typeof responseError.hint === "string" ? responseError.hint : undefined,
    });
    throw new Error(`Supabase database request failed (${response.status}).`);
  }

  return response;
}

async function getSupabaseDatabase(
  url: string,
  serviceRoleKey: string
): Promise<DatabaseSchema | null> {
  const response = await supabaseRequest(
    url,
    serviceRoleKey,
    `${SUPABASE_TABLE}?id=eq.1&select=state`
  );
  const rows = (await response.json()) as { state: DatabaseSchema }[];
  const state = rows[0]?.state;

  if (state && typeof state === "object" && Array.isArray(state.farmers)) {
    return state;
  }
  if (rows.length > 0) {
    throw new Error("Supabase database state is invalid.");
  }
  return null;
}

async function saveSupabaseDatabase(
  url: string,
  serviceRoleKey: string,
  data: DatabaseSchema
): Promise<void> {
  await supabaseRequest(url, serviceRoleKey, `${SUPABASE_TABLE}?on_conflict=id`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({ id: 1, state: data }),
  });
}

function getLocalDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initialDatabase = cloneInitialDatabase();
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDatabase, null, 2), "utf-8");
      return initialDatabase;
    }
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const database = JSON.parse(raw) as DatabaseSchema;
    if (addMissingDemoFarmers(database)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(database, null, 2), "utf-8");
    }
    return database;
  } catch (error) {
    console.error("Error reading database file:", error);
    throw new Error("Failed to read or update the local database.");
  }
}

export async function getDb(): Promise<DatabaseSchema> {
  const supabase = getSupabaseConfig();
  if (supabase) {
    const existing = await getSupabaseDatabase(supabase.url, supabase.serviceRoleKey);
    if (existing) {
      if (addMissingDemoFarmers(existing)) {
        await saveSupabaseDatabase(supabase.url, supabase.serviceRoleKey, existing);
      }
      return existing;
    }

    const initialDatabase = cloneInitialDatabase();
    await saveSupabaseDatabase(supabase.url, supabase.serviceRoleKey, initialDatabase);
    return initialDatabase;
  }

  if (process.env.VERCEL) {
    const missingVariables = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter(
      (name) => !process.env[name]?.trim()
    );
    console.error("Supabase configuration is missing in Vercel.", { missingVariables });
    throw new Error(
      `Supabase is required in Vercel. Missing environment variable(s): ${missingVariables.join(", ")}.`
    );
  }
  const localDatabase = getLocalDatabase();
  return localDatabase;
}

export async function saveDb(data: DatabaseSchema): Promise<void> {
  const supabase = getSupabaseConfig();
  if (supabase) {
    await saveSupabaseDatabase(supabase.url, supabase.serviceRoleKey, data);
    return;
  }

  if (process.env.VERCEL) {
    const missingVariables = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter(
      (name) => !process.env[name]?.trim()
    );
    console.error("Supabase configuration is missing in Vercel.", { missingVariables });
    throw new Error(
      `Supabase is required in Vercel. Missing environment variable(s): ${missingVariables.join(", ")}.`
    );
  }

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing database file:", error);
    throw new Error("Failed to save the local database.");
  }
}

// Clone Master Schedule for a Plot
export function cloneMasterScheduleForPlot(
  cropName: string,
  sowingDateStr: string,
  masterSchedules: DatabaseSchema["masterSchedules"]
): { spray: PersonalizedSprayItem[]; fertilizer: PersonalizedFertilizerItem[] } {
  const master = masterSchedules[cropName];

  if (!master) {
    return { spray: [], fertilizer: [] };
  }

  const spray = master.spraySchedules.map((item, idx) => ({
    id: `psp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
    day: item.day,
    time: item.time,
    medicineId: item.medicineId,
    medicineName: item.medicineName,
    quantity: item.quantity,
    unit: item.unit,
    waterQuantity: item.waterQuantity,
    note: item.note,
    isCompleted: false,
  }));

  const fertilizer = master.fertilizerSchedules.map((item, idx) => ({
    id: `pfr-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
    day: item.day,
    stage: item.stage,
    fertilizerId: item.fertilizerId,
    fertilizerName: item.fertilizerName,
    quantity: item.quantity,
    unit: item.unit,
    applicationMethod: item.applicationMethod,
    waterQuantity: item.waterQuantity || "",
    note: item.note,
    isCompleted: false,
  }));

  return { spray, fertilizer };
}
