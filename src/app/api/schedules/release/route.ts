import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { isAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
import { getDb, saveDb } from "@/lib/db";
import {
  dateFromCropDay,
  getDateInIndia,
  isValidScheduleDate,
} from "@/lib/schedule-date";
import { updateScheduleProgressStatuses } from "@/lib/schedule-progress";
import {
  MasterFertilizerItem,
  MasterSprayItem,
  PersonalizedFertilizerItem,
  PersonalizedSprayItem,
  ScheduleProgress,
} from "@/types";

function currentCropDay(sowingDate: string, currentDate: string): number {
  if (!isValidScheduleDate(sowingDate) || !isValidScheduleDate(currentDate)) return 0;
  const sowing = Date.parse(`${sowingDate}T00:00:00Z`);
  const current = Date.parse(`${currentDate}T00:00:00Z`);
  if (!Number.isFinite(sowing) || !Number.isFinite(current)) return 0;
  return Math.floor((current - sowing) / 86_400_000) + 1;
}

function addReleasedSprays(
  plot: { spraySchedule: PersonalizedSprayItem[] },
  items: MasterSprayItem[],
  firstDay: number,
  lastDay: number
): void {
  for (const item of items) {
    if (!Number.isInteger(item.day) || item.day < firstDay || item.day > lastDay) continue;

    const existing =
      plot.spraySchedule.find(
        (entry) => entry.masterScheduleItemId === item.id
      ) ||
      plot.spraySchedule.find(
        (entry) =>
          !entry.masterScheduleItemId &&
          entry.day === item.day &&
          entry.time === item.time &&
          entry.medicineId === item.medicineId
      ) ||
      plot.spraySchedule.find(
        (entry) =>
          !entry.masterScheduleItemId &&
          entry.day === item.day &&
          entry.time === item.time
      );
    if (existing) {
      existing.masterScheduleItemId = item.id;
      continue;
    }

    plot.spraySchedule.push({
      id: `psp-${randomUUID()}`,
      masterScheduleItemId: item.id,
      day: item.day,
      time: item.time,
      medicineId: item.medicineId,
      medicineName: item.medicineName,
      quantity: item.quantity,
      unit: item.unit,
      waterQuantity: item.waterQuantity,
      note: item.note,
      isCompleted: false,
    });
  }
  plot.spraySchedule.sort((left, right) => left.day - right.day);
}

function addReleasedFertilizers(
  plot: { fertilizerSchedule: PersonalizedFertilizerItem[] },
  items: MasterFertilizerItem[],
  firstDay: number,
  lastDay: number
): void {
  for (const item of items) {
    if (!Number.isInteger(item.day) || item.day < firstDay || item.day > lastDay) continue;

    const existing =
      plot.fertilizerSchedule.find(
        (entry) => entry.masterScheduleItemId === item.id
      ) ||
      plot.fertilizerSchedule.find(
        (entry) =>
          !entry.masterScheduleItemId &&
          entry.day === item.day &&
          entry.fertilizerId === item.fertilizerId &&
          entry.applicationMethod === item.applicationMethod
      ) ||
      plot.fertilizerSchedule.find(
        (entry) => !entry.masterScheduleItemId && entry.day === item.day
      );
    if (existing) {
      existing.masterScheduleItemId = item.id;
      continue;
    }

    plot.fertilizerSchedule.push({
      id: `pfr-${randomUUID()}`,
      masterScheduleItemId: item.id,
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
    });
  }
  plot.fertilizerSchedule.sort((left, right) => left.day - right.day);
}

export async function GET(request: Request) {
  try {
    const db = await getDb();
    if (!isAdminRequest(request, db)) return unauthorizedAdminResponse();

    if (updateScheduleProgressStatuses(db.scheduleProgress, db.farmers)) {
      await saveDb(db);
    }

    return NextResponse.json({
      success: true,
      progress: db.scheduleProgress,
      history: db.scheduleExtensionHistory,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to load schedule progress.";
    console.error("GET /api/schedules/release failed:", error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = await getDb();
    if (!isAdminRequest(request, db)) return unauthorizedAdminResponse();

    let body: { farmerId?: unknown; plotId?: unknown; totalDays?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "A valid JSON request body is required." },
        { status: 400 }
      );
    }

    const { farmerId, plotId, totalDays } = body;
    if (
      typeof farmerId !== "string" ||
      typeof plotId !== "string" ||
      typeof totalDays !== "number" ||
      !Number.isInteger(totalDays) ||
      totalDays < 1
    ) {
      return NextResponse.json(
        { success: false, message: "Farmer, plot, and a positive whole number of days are required." },
        { status: 400 }
      );
    }

    const farmer = db.farmers.find((entry) => entry.id === farmerId);
    if (!farmer) {
      return NextResponse.json({ success: false, message: "Farmer not found." }, { status: 404 });
    }

    const plot = farmer.plots.find((entry) => entry.id === plotId);
    if (!plot) {
      return NextResponse.json({ success: false, message: "Plot not found for this farmer." }, { status: 404 });
    }

    const masterSchedule = db.masterSchedules[plot.cropName];
    if (!masterSchedule) {
      return NextResponse.json(
        { success: false, message: `No master schedule exists for ${plot.cropName}.` },
        { status: 400 }
      );
    }

    const cropId = plot.cropName;
    const masterScheduleId = plot.cropName;
    const progressIndex = db.scheduleProgress.findIndex(
      (entry) =>
        entry.farmerId === farmer.id &&
        entry.plotId === plot.id &&
        entry.cropId === cropId &&
        entry.masterScheduleId === masterScheduleId
    );
    const existingProgress =
      progressIndex === -1 ? undefined : db.scheduleProgress[progressIndex];
    const previousDays = existingProgress?.totalDaysReleased ?? 0;
    const newTotalDays = totalDays;

    if (newTotalDays <= previousDays) {
      const message =
        newTotalDays === previousDays
          ? `No new schedule days to release. The farmer has already received ${previousDays} days.`
          : `The farmer has already received ${previousDays} days. Set Days must be greater than ${previousDays} to extend the schedule.`;
      return NextResponse.json({ success: false, message }, { status: 400 });
    }

    const masterDays = [
      ...masterSchedule.spraySchedules.map((item) => item.day),
      ...masterSchedule.fertilizerSchedules.map((item) => item.day),
    ];
    if (masterDays.some((day) => !Number.isInteger(day) || day < 1)) {
      return NextResponse.json(
        { success: false, message: "The master schedule contains an invalid day. Correct it before releasing days." },
        { status: 400 }
      );
    }

    const maxMasterDay = Math.max(
      0,
      ...masterDays
    );
    if (maxMasterDay === 0) {
      return NextResponse.json(
        { success: false, message: "This crop's master schedule has no days to release." },
        { status: 400 }
      );
    }
    if (Number(totalDays) > maxMasterDay) {
      return NextResponse.json(
        {
          success: false,
          message: `The master schedule for ${plot.cropName} ends at Day ${maxMasterDay}. Set Days cannot exceed ${maxMasterDay}.`,
        },
        { status: 400 }
      );
    }

    const startDate = existingProgress?.scheduleStartDate || plot.sowingDate;
    const endDate = dateFromCropDay(startDate, newTotalDays);
    if (!dateFromCropDay(startDate, 1) || !endDate) {
      return NextResponse.json(
        { success: false, message: "The plot must have a valid sowing date before releasing a schedule." },
        { status: 400 }
      );
    }

    const releasedStartDay = previousDays + 1;
    addReleasedSprays(
      plot,
      masterSchedule.spraySchedules,
      releasedStartDay,
      newTotalDays
    );
    addReleasedFertilizers(
      plot,
      masterSchedule.fertilizerSchedules,
      releasedStartDay,
      newTotalDays
    );

    const now = new Date().toISOString();
    const nextProgress: ScheduleProgress = {
      id: existingProgress?.id || `sp-${randomUUID()}`,
      farmerId: farmer.id,
      plotId: plot.id,
      cropId,
      masterScheduleId,
      totalDaysReleased: newTotalDays,
      lastDeliveredDay: newTotalDays,
      currentDay: currentCropDay(plot.sowingDate, getDateInIndia()),
      scheduleStartDate: startDate,
      scheduleEndDate: endDate,
      status: "ACTIVE",
      createdAt: existingProgress?.createdAt || now,
      updatedAt: now,
    };
    delete nextProgress.completedAt;

    if (progressIndex === -1) {
      db.scheduleProgress.push(nextProgress);
    } else {
      db.scheduleProgress[progressIndex] = nextProgress;
    }

    db.scheduleExtensionHistory.push({
      id: `sh-${randomUUID()}`,
      farmerId: farmer.id,
      plotId: plot.id,
      cropId,
      masterScheduleId,
      previousTotalDays: previousDays,
      newTotalDays,
      releasedStartDay,
      releasedEndDay: newTotalDays,
      actionType: previousDays === 0 ? "INITIAL" : "EXTENSION",
      createdAt: now,
      createdBy: db.admin.email,
    });

    await saveDb(db);
    return NextResponse.json({
      success: true,
      message: `Released Day ${releasedStartDay}–${newTotalDays} for ${farmer.name}'s ${plot.cropName} schedule.`,
      progress: nextProgress,
      history: db.scheduleExtensionHistory.filter(
        (entry) =>
          entry.farmerId === farmer.id &&
          entry.plotId === plot.id &&
          entry.cropId === cropId
      ),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to release schedule days.";
    console.error("POST /api/schedules/release failed:", error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
