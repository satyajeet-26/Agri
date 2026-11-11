import { NextResponse } from "next/server";
import { getDb, saveDb, cloneMasterScheduleForPlot } from "@/lib/db";
import { isAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
import { isFarmerRequest } from "@/lib/farmer-auth";
import { PersonalizedSprayItem, PersonalizedFertilizerItem } from "@/types";
import {
  dateFromCropDay,
  getDateInIndia,
  getFertilizerScheduledDate,
  getSprayScheduledDate,
  isValidScheduleDate,
} from "@/lib/schedule-date";
import {
  farmerScheduleView,
  getScheduleDayNumber,
  updateScheduleProgressStatuses,
} from "@/lib/schedule-progress";
import { ScheduleDayStatus } from "@/types";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; plotId: string }> }
) {
  try {
    const { id, plotId } = await params;
    const db = await getDb();
    const isAdmin = isAdminRequest(req, db);
    if (!isAdmin && !isFarmerRequest(req, id, db)) {
      return NextResponse.json(
        { success: false, message: "Authentication is required." },
        { status: 401 }
      );
    }

    const farmer = db.farmers.find((entry) => entry.id === id);
    if (!farmer) {
      return NextResponse.json({ success: false, message: "Farmer not found." }, { status: 404 });
    }
    const plot = farmer.plots.find((entry) => entry.id === plotId);
    if (!plot) {
      return NextResponse.json({ success: false, message: "Plot not found." }, { status: 404 });
    }
    if (!isAdmin && plot.isActive === false) {
      return NextResponse.json(
        { success: false, message: "This plot is inactive. Its schedule is unavailable." },
        { status: 403 }
      );
    }

    if (updateScheduleProgressStatuses(db.scheduleProgress, db.farmers)) {
      await saveDb(db);
    }

    const progress =
      db.scheduleProgress.find(
        (entry) =>
          entry.farmerId === id &&
          entry.plotId === plotId &&
          entry.cropId === plot.cropName &&
          entry.masterScheduleId === plot.cropName
      ) || null;
    const totalDaysReleased = progress?.totalDaysReleased ?? 0;
    const currentDate = getDateInIndia();
    const scheduleStartDate = progress?.scheduleStartDate || plot.sowingDate;
    const currentDay = progress?.currentDay ??
      getScheduleDayNumber(scheduleStartDate, currentDate);
    const visiblePlot = isAdmin
      ? plot
      : farmerScheduleView(farmer, db.scheduleProgress).plots.find(
          (entry) => entry.id === plotId
        );
    if (!visiblePlot) {
      return NextResponse.json({ success: false, message: "Plot not found." }, { status: 404 });
    }
    const days = Array.from({ length: totalDaysReleased }, (_, index) => {
      const day = index + 1;
      const date = dateFromCropDay(scheduleStartDate, day) || scheduleStartDate;
      const status: ScheduleDayStatus =
        date < currentDate ? "COMPLETED" : date === currentDate ? "TODAY" : "UPCOMING";
      return {
        day,
        date,
        status,
        sprays: visiblePlot.spraySchedule.filter((item) => item.day === day),
        fertilizers: visiblePlot.fertilizerSchedule.filter((item) => item.day === day),
      };
    });

    return NextResponse.json({
      success: true,
      farmerName: farmer.name,
      timeline: {
        plot: {
          id: plot.id,
          plotName: plot.plotName,
          isActive: plot.isActive !== false,
          cropName: plot.cropName,
          sowingDate: plot.sowingDate,
          areaAcre: plot.areaAcre,
          areaGuntha: plot.areaGuntha,
          totalGuntha: plot.totalGuntha,
        },
        progress,
        currentDate,
        currentDay,
        totalDaysReleased,
        remainingDays: Math.max(0, totalDaysReleased - currentDay),
        status: progress?.status || "NOT_RELEASED",
        days,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to load plot schedule.";
    console.error("GET plot schedule failed:", error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; plotId: string }> }
) {
  try {
    const { id, plotId } = await params;
    const db = await getDb();
    if (!isAdminRequest(req, db)) return unauthorizedAdminResponse();
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "A valid JSON request body is required." },
        { status: 400 }
      );
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, message: "A valid schedule operation is required." },
        { status: 400 }
      );
    }

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
    const supportedActions = [
      "UPDATE_SPRAY",
      "ADD_SPRAY",
      "DELETE_SPRAY",
      "UPDATE_FERTILIZER",
      "ADD_FERTILIZER",
      "DELETE_FERTILIZER",
      "RESET_TO_MASTER",
      "TOGGLE_COMPLETED",
    ];
    if (!supportedActions.includes(action)) {
      return NextResponse.json(
        { success: false, message: "Unsupported plot schedule action." },
        { status: 400 }
      );
    }

    if (
      ["ADD_SPRAY", "UPDATE_SPRAY", "ADD_FERTILIZER", "UPDATE_FERTILIZER"].includes(action) &&
      (!item ||
        typeof item !== "object" ||
        !Number.isInteger(Number(item.day)) ||
        Number(item.day) < 1 ||
        (item.scheduledDate !== undefined && !isValidScheduleDate(item.scheduledDate)))
    ) {
      return NextResponse.json(
        { success: false, message: "A positive whole-number day and valid scheduled date are required." },
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
      if (index === -1) {
        return NextResponse.json(
          { success: false, message: "Spray schedule item was not found." },
          { status: 404 }
        );
      }
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
    } else if (action === "DELETE_SPRAY") {
      const originalLength = plot.spraySchedule.length;
      plot.spraySchedule = plot.spraySchedule.filter((s) => s.id !== itemId);
      if (plot.spraySchedule.length === originalLength) {
        return NextResponse.json(
          { success: false, message: "Spray schedule item was not found." },
          { status: 404 }
        );
      }
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
      if (index === -1) {
        return NextResponse.json(
          { success: false, message: "Fertilizer schedule item was not found." },
          { status: 404 }
        );
      }
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
    } else if (action === "DELETE_FERTILIZER") {
      const originalLength = plot.fertilizerSchedule.length;
      plot.fertilizerSchedule = plot.fertilizerSchedule.filter((f) => f.id !== itemId);
      if (plot.fertilizerSchedule.length === originalLength) {
        return NextResponse.json(
          { success: false, message: "Fertilizer schedule item was not found." },
          { status: 404 }
        );
      }
    } else if (action === "TOGGLE_COMPLETED") {
      if (type !== "spray" && type !== "fertilizer") {
        return NextResponse.json(
          { success: false, message: "Schedule type must be spray or fertilizer." },
          { status: 400 }
        );
      }
      if (type === "spray") {
        const target = plot.spraySchedule.find((s) => s.id === itemId);
        if (!target) {
          return NextResponse.json(
            { success: false, message: "Spray schedule item was not found." },
            { status: 404 }
          );
        }
        target.isCompleted = !target.isCompleted;
      } else {
        const target = plot.fertilizerSchedule.find((f) => f.id === itemId);
        if (!target) {
          return NextResponse.json(
            { success: false, message: "Fertilizer schedule item was not found." },
            { status: 404 }
          );
        }
        target.isCompleted = !target.isCompleted;
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
