import { NextResponse } from "next/server";
import { getDb, saveDb, cloneMasterScheduleForPlot } from "@/lib/db";
import { calculateTotalGuntha } from "@/lib/area";
import { Plot } from "@/types";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const farmer = db.farmers.find((f) => f.id === id);

    if (!farmer) {
      return NextResponse.json({ success: false, message: "Farmer not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, farmer });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const db = getDb();
    const index = db.farmers.findIndex((f) => f.id === id);

    if (index === -1) {
      return NextResponse.json({ success: false, message: "Farmer not found" }, { status: 404 });
    }

    const current = db.farmers[index];

    // If updating plots
    let updatedPlots = current.plots;
    if (Array.isArray(body.plots)) {
      updatedPlots = body.plots.map((p: any) => {
        const acre = Number(p.areaAcre) || 0;
        const guntha = Number(p.areaGuntha) || 0;
        const totalGuntha = calculateTotalGuntha(acre, guntha);

        // If this is a brand new plot without schedules, clone master
        let spray = p.spraySchedule;
        let fertilizer = p.fertilizerSchedule;

        if (!spray || spray.length === 0) {
          const cloned = cloneMasterScheduleForPlot(p.cropName, p.sowingDate);
          spray = cloned.spray;
          fertilizer = cloned.fertilizer;
        }

        return {
          id: p.id || `plt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          plotName: p.plotName,
          cropName: p.cropName,
          sowingDate: p.sowingDate,
          areaAcre: acre,
          areaGuntha: guntha,
          totalGuntha,
          spraySchedule: spray,
          fertilizerSchedule: fertilizer,
        };
      });
    }

    db.farmers[index] = {
      ...current,
      name: body.name ?? current.name,
      mobile: body.mobile ?? current.mobile,
      whatsapp: body.whatsapp ?? current.whatsapp,
      openingBalanceType: body.openingBalanceType ?? current.openingBalanceType,
      openingBalance: body.openingBalance !== undefined ? Number(body.openingBalance) : current.openingBalance,
      registrationDate: body.registrationDate ?? current.registrationDate,
      state: body.state ?? current.state,
      district: body.district ?? current.district,
      taluka: body.taluka ?? current.taluka,
      village: body.village ?? current.village,
      username: body.username ?? current.username,
      passwordHash: body.password ?? current.passwordHash,
      plainPassword: body.password ?? current.plainPassword,
      isActive: body.isActive !== undefined ? body.isActive : current.isActive,
      plots: updatedPlots,
    };

    saveDb(db);

    return NextResponse.json({
      success: true,
      message: "Farmer updated successfully",
      farmer: db.farmers[index],
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const index = db.farmers.findIndex((f) => f.id === id);

    if (index === -1) {
      return NextResponse.json({ success: false, message: "Farmer not found" }, { status: 404 });
    }

    db.farmers.splice(index, 1);
    saveDb(db);

    return NextResponse.json({ success: true, message: "Farmer deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

