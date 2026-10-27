import { NextResponse } from "next/server";
import { getDb, saveDb, cloneMasterScheduleForPlot } from "@/lib/db";
import { calculateTotalGuntha } from "@/lib/area";
import { Farmer, Plot } from "@/types";

export async function GET() {
  try {
    const db = getDb();
    return NextResponse.json({ success: true, farmers: db.farmers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = getDb();

    // Check duplicate username
    if (body.username) {
      const existing = db.farmers.find(
        (f) => f.username.toLowerCase() === body.username.toLowerCase()
      );
      if (existing) {
        return NextResponse.json(
          { success: false, message: "A farmer with this username already exists" },
          { status: 400 }
        );
      }
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
        const { spray, fertilizer } = cloneMasterScheduleForPlot(cropName, sowingDate);

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
      state: body.state || "Maharashtra (महाराष्ट्र)",
      district: body.district || "Satara (सातारा)",
      taluka: body.taluka || "Karad (कराड)",
      village: body.village || "Kole (कोळे)",
      username: body.username || `farmer_${Date.now().toString().slice(-4)}`,
      passwordHash: body.password || "1234",
      plainPassword: body.password || "1234",
      isActive: body.isActive !== undefined ? body.isActive : true,
      plots: initialPlots,
    };

    db.farmers.unshift(newFarmer);
    saveDb(db);

    return NextResponse.json({
      success: true,
      message: "Farmer registered successfully",
      farmer: newFarmer,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

