import { getDateInIndia, isValidScheduleDate } from "@/lib/schedule-date";
import { Farmer, ScheduleProgress } from "@/types";

export function getScheduleDayNumber(
  scheduleStartDate: string,
  currentDate = getDateInIndia()
): number {
  if (!isValidScheduleDate(scheduleStartDate) || !isValidScheduleDate(currentDate)) return 0;
  const start = Date.parse(`${scheduleStartDate}T00:00:00Z`);
  const current = Date.parse(`${currentDate}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(current)) return 0;
  return Math.max(0, Math.floor((current - start) / 86_400_000) + 1);
}

export function updateScheduleProgressStatuses(
  progressEntries: ScheduleProgress[],
  farmers: Farmer[],
  currentDate = getDateInIndia()
): boolean {
  let changed = false;

  for (const progress of progressEntries) {
    const farmer = farmers.find((entry) => entry.id === progress.farmerId);
    const plot = farmer?.plots.find((entry) => entry.id === progress.plotId);
    const currentDay = plot
      ? getScheduleDayNumber(progress.scheduleStartDate || plot.sowingDate, currentDate)
      : 0;

    if (progress.currentDay !== currentDay) {
      progress.currentDay = currentDay;
      progress.updatedAt = new Date().toISOString();
      changed = true;
    }

    if (
      progress.status === "ACTIVE" &&
      currentDay >= progress.totalDaysReleased &&
      currentDay > 0
    ) {
      progress.status = "COMPLETED";
      progress.completedAt = new Date().toISOString();
      progress.updatedAt = progress.completedAt;
      changed = true;
    }
  }

  return changed;
}

export function farmerScheduleView(
  farmer: Farmer,
  progressEntries: ScheduleProgress[]
): Farmer {
  return {
    ...farmer,
    plots: farmer.plots.map((plot) => {
      const progress = progressEntries.find(
        (entry) =>
          entry.farmerId === farmer.id &&
          entry.plotId === plot.id &&
          entry.cropId === plot.cropName
      );
      const totalDaysReleased = progress?.totalDaysReleased ?? 0;

      return {
        ...plot,
        spraySchedule: plot.spraySchedule.filter(
          (item) => item.day <= totalDaysReleased
        ),
        fertilizerSchedule: plot.fertilizerSchedule.filter(
          (item) => item.day <= totalDaysReleased
        ),
      };
    }),
  };
}
