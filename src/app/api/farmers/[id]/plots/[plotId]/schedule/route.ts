import { NextResponse } from "next/server";
import { getDb, saveDb, cloneMasterScheduleForPlot } from "@/lib/db";
import { PersonalizedSprayItem, PersonalizedFertilizerItem } from "@/types";
import {
  getFertilizerScheduledDate,
  getSprayScheduledDate,
  isValidScheduleDate,
} from "@/lib/schedule-date";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; plotId: string }> }
) {
  try {
    const { id, plotId } = await params;
    const body = await req.json();
    const db = await getDb();

    const farmer = db.farmers.find((f) => f.id === id);
    if (!farmer) {
      return NextResponse.json({ success: false, message: "Farmer not found" }, { status: 404 });
    }

    const plot = farmer.plots.find((p) => p.id === plotId);
    if (!plot) {
      return NextResponse.json({ success: false, message: "Plot not found" }, { status: 404 });
    }

    // Action types:
    // 1. "UPDATE_SPRAY": replace or update a spray schedule item
    // 2. "ADD_SPRAY": add a new day to spray schedule
    // 3. "DELETE_SPRAY": delete a day from spray schedule
    // 4. "UPDATE_FERTILIZER": update a fertilizer schedule item
    // 5. "ADD_FERTILIZER": add a day to fertilizer schedule
    // 6. "DELETE_FERTILIZER": delete a day from fertilizer schedule
    // 7. "RESET_TO_MASTER": re-clone standard template for this plot

    const { action, item, itemId, type } = body;

    if (
      ["ADD_SPRAY", "UPDATE_SPRAY", "ADD_FERTILIZER", "UPDATE_FERTILIZER"].includes(action) &&
      item?.scheduledDate !== undefined &&
      !isValidScheduleDate(item.scheduledDate)
    ) {
      return NextResponse.json(
        { success: false, message: "Scheduled date must be a valid calendar date (YYYY-MM-DD)." },
        { status: 400 }
      );
    }

    if (action === "RESET_TO_MASTER") {
      const cloned = cloneMasterScheduleForPlot(
        plot.cropName,
        plot.sowingDate,
        db.masterSchedules
      );
      plot.spraySchedule = cloned.spray;
      plot.fertilizerSchedule = cloned.fertilizer;
      await saveDb(db);
      return NextResponse.json({
        success: true,
        message: "Plot schedule reset to master template",
        plot,
      });
    }

    if (action === "ADD_SPRAY") {
      const newItem: PersonalizedSprayItem = {
        id: `psp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        day: Number(item.day),
        scheduledDate: isValidScheduleDate(item.scheduledDate) ? item.scheduledDate : undefined,
        time: item.time || "Morning",
        medicineId: item.medicineId || "",
        medicineName: item.medicineName || "",
        quantity: String(item.quantity || "0"),
        unit: item.unit || "ml",
        waterQuantity: item.waterQuantity || "15 Litres",
        note: item.note || "",
        isCompleted: false,
      };
      plot.spraySchedule.push(newItem);
      // Sort by day ascending
      plot.spraySchedule.sort((a, b) =>
        (getSprayScheduledDate(plot, a) || "").localeCompare(
          getSprayScheduledDate(plot, b) || ""
        )
      );
    } else if (action === "UPDATE_SPRAY") {
      const index = plot.spraySchedule.findIndex((s) => s.id === item.id);
      if (index !== -1) {
        plot.spraySchedule[index] = {
          ...plot.spraySchedule[index],
          ...item,
          day: Number(item.day),
          scheduledDate: isValidScheduleDate(item.scheduledDate) ? item.scheduledDate : undefined,
        };
        plot.spraySchedule.sort((a, b) =>
          (getSprayScheduledDate(plot, a) || "").localeCompare(
            getSprayScheduledDate(plot, b) || ""
          )
        );
      }
    } else if (action === "DELETE_SPRAY") {
      plot.spraySchedule = plot.spraySchedule.filter((s) => s.id !== itemId);
    } else if (action === "ADD_FERTILIZER") {
      const newItem: PersonalizedFertilizerItem = {
        id: `pfr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        day: Number(item.day),
        scheduledDate: isValidScheduleDate(item.scheduledDate) ? item.scheduledDate : undefined,
        stage: item.stage || "Growth",
        fertilizerId: item.fertilizerId || "",
        fertilizerName: item.fertilizerName || "",
        quantity: String(item.quantity || "0"),
        unit: item.unit || "kg",
        applicationMethod: item.applicationMethod || "Drip Irrigation",
        waterQuantity: item.waterQuantity || "",
        note: item.note || "",
        isCompleted: false,
      };
      plot.fertilizerSchedule.push(newItem);
      plot.fertilizerSchedule.sort((a, b) =>
        (getFertilizerScheduledDate(plot, a) || "").localeCompare(
          getFertilizerScheduledDate(plot, b) || ""
        )
      );
    } else if (action === "UPDATE_FERTILIZER") {
      const index = plot.fertilizerSchedule.findIndex((f) => f.id === item.id);
      if (index !== -1) {
        plot.fertilizerSchedule[index] = {
          ...plot.fertilizerSchedule[index],
          ...item,
          day: Number(item.day),
          scheduledDate: isValidScheduleDate(item.scheduledDate) ? item.scheduledDate : undefined,
        };
        plot.fertilizerSchedule.sort((a, b) =>
          (getFertilizerScheduledDate(plot, a) || "").localeCompare(
            getFertilizerScheduledDate(plot, b) || ""
          )
        );
      }
    } else if (action === "DELETE_FERTILIZER") {
      plot.fertilizerSchedule = plot.fertilizerSchedule.filter((f) => f.id !== itemId);
    } else if (action === "TOGGLE_COMPLETED") {
      if (type === "spray") {
        const target = plot.spraySchedule.find((s) => s.id === itemId);
        if (target) target.isCompleted = !target.isCompleted;
      } else {
        const target = plot.fertilizerSchedule.find((f) => f.id === itemId);
        if (target) target.isCompleted = !target.isCompleted;
      }
    }

    await saveDb(db);

    return NextResponse.json({
      success: true,
      message: "Personalized schedule updated successfully for this plot only",
      plot,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
