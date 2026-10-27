import { NextResponse } from "next/server";
import { getDb, saveDb } from "@/lib/db";
import { MasterCropSchedule } from "@/types";

export async function GET() {
  try {
    const db = getDb();
    return NextResponse.json({ success: true, masterSchedules: db.masterSchedules });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = getDb();
    const { action, cropName, scheduleType, item, itemId, newCropName } = body;

    if (!cropName && !newCropName) {
      return NextResponse.json({ success: false, message: "Crop name is required" }, { status: 400 });
    }

    const targetCrop = cropName || newCropName;

    // Ensure crop entry exists
    if (!db.masterSchedules[targetCrop]) {
      db.masterSchedules[targetCrop] = {
        cropName: targetCrop,
        spraySchedules: [],
        fertilizerSchedules: [],
      };
    }

    const cropSchedule = db.masterSchedules[targetCrop];

    if (action === "ADD_CROP") {
      // Crop already created in guard above
      saveDb(db);
      return NextResponse.json({ success: true, message: `Crop ${targetCrop} added`, cropSchedule });
    }

    if (action === "ADD_ITEM") {
      if (scheduleType === "spray") {
        const newItem = {
          id: `msp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          day: Number(item.day),
          time: item.time || "Morning",
          medicineId: item.medicineId || "",
          medicineName: item.medicineName || "",
          quantity: String(item.quantity || ""),
          unit: item.unit || "ml",
          waterQuantity: item.waterQuantity || "15 Litres",
          note: item.note || "",
        };
        cropSchedule.spraySchedules.push(newItem);
        cropSchedule.spraySchedules.sort((a, b) => a.day - b.day);
      } else {
        const newItem = {
          id: `mfr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          day: Number(item.day),
          stage: item.stage || "",
          fertilizerId: item.fertilizerId || "",
          fertilizerName: item.fertilizerName || "",
          quantity: String(item.quantity || ""),
          unit: item.unit || "kg",
          applicationMethod: item.applicationMethod || "Drip",
          waterQuantity: item.waterQuantity || "",
          note: item.note || "",
        };
        cropSchedule.fertilizerSchedules.push(newItem);
        cropSchedule.fertilizerSchedules.sort((a, b) => a.day - b.day);
      }
    } else if (action === "UPDATE_ITEM") {
      if (scheduleType === "spray") {
        const index = cropSchedule.spraySchedules.findIndex((s) => s.id === item.id);
        if (index !== -1) {
          cropSchedule.spraySchedules[index] = { ...item, day: Number(item.day) };
          cropSchedule.spraySchedules.sort((a, b) => a.day - b.day);
        }
      } else {
        const index = cropSchedule.fertilizerSchedules.findIndex((f) => f.id === item.id);
        if (index !== -1) {
          cropSchedule.fertilizerSchedules[index] = { ...item, day: Number(item.day) };
          cropSchedule.fertilizerSchedules.sort((a, b) => a.day - b.day);
        }
      }
    } else if (action === "DELETE_ITEM") {
      if (scheduleType === "spray") {
        cropSchedule.spraySchedules = cropSchedule.spraySchedules.filter((s) => s.id !== itemId);
      } else {
        cropSchedule.fertilizerSchedules = cropSchedule.fertilizerSchedules.filter((f) => f.id !== itemId);
      }
    } else if (action === "DELETE_CROP") {
      delete db.masterSchedules[targetCrop];
    }

    saveDb(db);

    return NextResponse.json({
      success: true,
      message: "Master Schedule updated successfully (Templates only)",
      masterSchedules: db.masterSchedules,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

