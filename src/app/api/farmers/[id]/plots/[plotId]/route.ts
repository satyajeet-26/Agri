import { NextResponse } from "next/server";
import { getDb, saveDb, toPublicFarmer } from "@/lib/db";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; plotId: string }> }
) {
  try {
    const { id, plotId } = await params;
    const db = await getDb();
    const farmer = db.farmers.find((item) => item.id === id);

    if (!farmer) {
      return NextResponse.json(
        { success: false, message: "Farmer not found" },
        { status: 404 }
      );
    }

    const plotIndex = farmer.plots.findIndex((plot) => plot.id === plotId);
    if (plotIndex === -1) {
      return NextResponse.json(
        { success: false, message: "Plot not found" },
        { status: 404 }
      );
    }

    farmer.plots.splice(plotIndex, 1);
    await saveDb(db);

    return NextResponse.json({
      success: true,
      message: "Plot deleted successfully",
      farmer: toPublicFarmer(farmer),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
