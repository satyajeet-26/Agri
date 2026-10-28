import { NextResponse } from "next/server";
import { getDb, saveDb, cloneMasterScheduleForPlot, toPublicFarmer } from "@/lib/db";
import { calculateTotalGuntha } from "@/lib/area";
import { Farmer, Plot } from "@/types";

export async function GET() {
  try {
    const db = await getDb();
    return NextResponse.json({
      success: true,
      farmers: db.farmers.map(toPublicFarmer),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = await getDb();

    const requestedUsername =
      typeof body.username === "string" ? body.username.trim() : "";
    const usernameBase = requestedUsername || `farmer_${Date.now().toString(36)}`;
    let username = usernameBase;
    let suffix = 2;
    const usernameExists = (candidate: string) =>
      db.farmers.some(
        (farmer) => (farmer.username || "").trim().toLowerCase() === candidate.toLowerCase()
      );

    while (usernameExists(username)) {
      username = `${usernameBase}_${suffix++}`;
    }

    const farmerId = `fm-${Date.now()}`;
    const initialPlots: Plot[] = [];

    // If initial plots are provided
    if (Array.isArray(body.plots) && body.plots.length > 0) {
      for (const rawPlot of body.plots) {
        const plotId = `plt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const acre = Number(rawPlot.areaAcre) || 0;
        const guntha = Number(rawPlot.areaGuntha) || 0;
        const totalGuntha = calculateTotalGuntha(acre, guntha);
        const cropName = rawPlot.cropName || "Tomato";
        const sowingDate = rawPlot.sowingDate || new Date().toISOString().split("T")[0];

        // Clone master schedule for this plot
        const { spray, fertilizer } = cloneMasterScheduleForPlot(
          cropName,
          sowingDate,
          db.masterSchedules
        );

        initialPlots.push({
          id: plotId,
          plotName: rawPlot.plotName || "Plot 1",
          cropName,
          sowingDate,
          areaAcre: acre,
          areaGuntha: guntha,
          totalGuntha,
          spraySchedule: spray,
          fertilizerSchedule: fertilizer,
        });
      }
    }

    const newFarmer: Farmer = {
      id: farmerId,
      name: body.name,
      mobile: body.mobile,
      whatsapp: body.whatsapp || body.mobile,
      openingBalanceType: body.openingBalanceType || "Debit",
      openingBalance: Number(body.openingBalance) || 0,
      registrationDate: body.registrationDate || new Date().toISOString().split("T")[0],
      state: body.state || "",
      district: body.district || "",
      taluka: body.taluka || "",
      village: body.village || "",
      username,
      passwordHash: body.password || "1234",
      plainPassword: body.password || "1234",
      isActive: body.isActive !== undefined ? body.isActive : true,
      plots: initialPlots,
    };

    db.farmers.unshift(newFarmer);
    await saveDb(db);

    return NextResponse.json({
      success: true,
      message: "Farmer registered successfully",
      usernameAdjusted: username !== requestedUsername,
      farmer: toPublicFarmer(newFarmer),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
