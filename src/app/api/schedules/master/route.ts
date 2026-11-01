import { NextResponse } from "next/server";
import { getDb, saveDb } from "@/lib/db";
import { isAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
import { MasterFertilizerItem, MasterSprayItem, ScheduleTime } from "@/types";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function getDay(value: unknown): number | undefined {
  const day = Number(value);
  return Number.isInteger(day) && day > 0 ? day : undefined;
}

function getScheduleTime(value: unknown, fallback: ScheduleTime = "Morning"): ScheduleTime {
  return value === "Morning" || value === "Evening" ? value : fallback;
}

function invalidRequest(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function GET(request: Request) {
  try {
    const db = await getDb();
    if (!isAdminRequest(request, db)) return unauthorizedAdminResponse();
    return NextResponse.json({ success: true, masterSchedules: db.masterSchedules });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to load master schedules.";
    console.error("GET /api/schedules/master failed:", error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return invalidRequest("A valid JSON request body is required.");
    }

    if (!isRecord(body)) return invalidRequest("A valid schedule operation is required.");

    const db = await getDb();
    if (!isAdminRequest(request, db)) return unauthorizedAdminResponse();

    const action = body.action;
    const cropInput = action === "ADD_CROP" ? body.newCropName ?? body.cropName : body.cropName;
    const cropName = typeof cropInput === "string" ? cropInput.trim() : "";
    if (!cropName) return invalidRequest("Crop name is required.");

    if (action === "ADD_CROP") {
      if (!db.masterSchedules[cropName]) {
        db.masterSchedules[cropName] = {
          cropName,
          spraySchedules: [],
          fertilizerSchedules: [],
        };
        await saveDb(db);
      }
      return NextResponse.json({
        success: true,
        message: `Crop ${cropName} added`,
        cropSchedule: db.masterSchedules[cropName],
        masterSchedules: db.masterSchedules,
      });
    }

    const cropSchedule = db.masterSchedules[cropName];
    if (!cropSchedule) return invalidRequest(`No master schedule exists for ${cropName}.`, 404);

    if (action === "DELETE_CROP") {
      delete db.masterSchedules[cropName];
      await saveDb(db);
      return NextResponse.json({
        success: true,
        message: `Crop ${cropName} and its master schedules deleted.`,
        masterSchedules: db.masterSchedules,
      });
    }

    const scheduleType = body.scheduleType;
    if (scheduleType !== "spray" && scheduleType !== "fertilizer") {
      return invalidRequest("Schedule type must be spray or fertilizer.");
    }

    if (action === "ADD_ITEM") {
      const rawItem = body.item;
      if (!isRecord(rawItem)) return invalidRequest("Schedule item details are required.");
      const day = getDay(rawItem.day);
      if (day === undefined) return invalidRequest("Schedule day must be a positive whole number.");

      if (scheduleType === "spray") {
        const items = Array.isArray(body.items) ? body.items : [rawItem];
        if (
          items.length === 0 ||
          items.some(
            (entry) => !isRecord(entry) || !stringValue(entry.medicineName).trim()
          )
        ) {
          return invalidRequest("Enter at least one medicine name for the spray day.");
        }

        const sprayItems: MasterSprayItem[] = items.map((entry) => {
          const sprayItem = entry as JsonRecord;
          return {
            id: `msp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
            day,
            time: getScheduleTime(rawItem.time),
            medicineId: stringValue(sprayItem.medicineId),
            medicineName: stringValue(sprayItem.medicineName).trim(),
            quantity: stringValue(sprayItem.quantity),
            unit: stringValue(sprayItem.unit, "ml"),
            waterQuantity: stringValue(rawItem.waterQuantity, "15 Litres"),
            note: stringValue(rawItem.note),
          };
        });
        cropSchedule.spraySchedules.push(...sprayItems);
        cropSchedule.spraySchedules.sort((left, right) => left.day - right.day);
      } else {
        if (!stringValue(rawItem.fertilizerName).trim()) {
          return invalidRequest("Enter a fertilizer name for the schedule item.");
        }
        const fertilizerItem: MasterFertilizerItem = {
          id: `mfr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          day,
          stage: stringValue(rawItem.stage),
          fertilizerId: stringValue(rawItem.fertilizerId),
          fertilizerName: stringValue(rawItem.fertilizerName).trim(),
          quantity: stringValue(rawItem.quantity),
          unit: stringValue(rawItem.unit, "kg"),
          applicationMethod: stringValue(rawItem.applicationMethod, "Drip"),
          waterQuantity: stringValue(rawItem.waterQuantity),
          note: stringValue(rawItem.note),
        };
        cropSchedule.fertilizerSchedules.push(fertilizerItem);
        cropSchedule.fertilizerSchedules.sort((left, right) => left.day - right.day);
      }
    } else if (action === "UPDATE_ITEM") {
      const rawItem = body.item;
      if (!isRecord(rawItem) || typeof rawItem.id !== "string") {
        return invalidRequest("The schedule item to update was not provided.");
      }
      const day = getDay(rawItem.day);
      if (day === undefined) return invalidRequest("Schedule day must be a positive whole number.");

      if (scheduleType === "spray") {
        const index = cropSchedule.spraySchedules.findIndex((entry) => entry.id === rawItem.id);
        if (index === -1) return invalidRequest("Spray schedule item was not found.", 404);
        const medicineName = stringValue(rawItem.medicineName).trim();
        if (!medicineName) return invalidRequest("Enter a medicine name for the spray day.");
        cropSchedule.spraySchedules[index] = {
          id: rawItem.id,
          day,
          time: getScheduleTime(rawItem.time),
          medicineId: stringValue(rawItem.medicineId),
          medicineName,
          quantity: stringValue(rawItem.quantity),
          unit: stringValue(rawItem.unit, "ml"),
          waterQuantity: stringValue(rawItem.waterQuantity, "15 Litres"),
          note: stringValue(rawItem.note),
        };
        cropSchedule.spraySchedules.sort((left, right) => left.day - right.day);
      } else {
        const index = cropSchedule.fertilizerSchedules.findIndex((entry) => entry.id === rawItem.id);
        if (index === -1) return invalidRequest("Fertilizer schedule item was not found.", 404);
        const fertilizerName = stringValue(rawItem.fertilizerName).trim();
        if (!fertilizerName) return invalidRequest("Enter a fertilizer name for the schedule item.");
        cropSchedule.fertilizerSchedules[index] = {
          id: rawItem.id,
          day,
          stage: stringValue(rawItem.stage),
          fertilizerId: stringValue(rawItem.fertilizerId),
          fertilizerName,
          quantity: stringValue(rawItem.quantity),
          unit: stringValue(rawItem.unit, "kg"),
          applicationMethod: stringValue(rawItem.applicationMethod, "Drip"),
          waterQuantity: stringValue(rawItem.waterQuantity),
          note: stringValue(rawItem.note),
        };
        cropSchedule.fertilizerSchedules.sort((left, right) => left.day - right.day);
      }
    } else if (action === "DELETE_ITEM") {
      if (typeof body.itemId !== "string" || !body.itemId) {
        return invalidRequest("The schedule item to delete was not provided.");
      }
      if (scheduleType === "spray") {
        const originalLength = cropSchedule.spraySchedules.length;
        cropSchedule.spraySchedules = cropSchedule.spraySchedules.filter(
          (entry) => entry.id !== body.itemId
        );
        if (cropSchedule.spraySchedules.length === originalLength) {
          return invalidRequest("Spray schedule item was not found.", 404);
        }
      } else {
        const originalLength = cropSchedule.fertilizerSchedules.length;
        cropSchedule.fertilizerSchedules = cropSchedule.fertilizerSchedules.filter(
          (entry) => entry.id !== body.itemId
        );
        if (cropSchedule.fertilizerSchedules.length === originalLength) {
          return invalidRequest("Fertilizer schedule item was not found.", 404);
        }
      }
    } else {
      return invalidRequest("Unsupported master schedule action.");
    }

    await saveDb(db);
    return NextResponse.json({
      success: true,
      message: "Master Schedule updated successfully (Templates only)",
      masterSchedules: db.masterSchedules,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to update master schedules.";
    console.error("POST /api/schedules/master failed:", error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
