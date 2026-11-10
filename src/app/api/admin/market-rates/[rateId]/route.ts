import { NextResponse } from "next/server";
import { getDb, saveDb } from "@/lib/db";
import { isAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
import { validateMarketRateInput } from "@/lib/market-rates";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ rateId: string }> }
) {
  try {
    const db = await getDb();
    if (!isAdminRequest(request, db)) return unauthorizedAdminResponse();
    const { rateId } = await params;
    const index = (db.marketRates || []).findIndex((rate) => rate.id === rateId);
    if (index < 0) {
      return NextResponse.json({ success: false, message: "Market rate not found." }, { status: 404 });
    }

    const validation = validateMarketRateInput(await request.json());
    if ("error" in validation) {
      return NextResponse.json({ success: false, message: validation.error }, { status: 400 });
    }
    const input = validation.input;
    const duplicate = db.marketRates.find(
      (rate) =>
        rate.id !== rateId &&
        rate.rateDate === input.rateDate &&
        rate.state.toLocaleLowerCase() === input.state.toLocaleLowerCase() &&
        rate.district.toLocaleLowerCase() === input.district.toLocaleLowerCase() &&
        rate.marketName.toLocaleLowerCase() === input.marketName.toLocaleLowerCase() &&
        rate.cropName.toLocaleLowerCase() === input.cropName.toLocaleLowerCase() &&
        rate.cropVariety.toLocaleLowerCase() === input.cropVariety.toLocaleLowerCase()
    );
    if (duplicate) {
      return NextResponse.json(
        { success: false, message: "A rate for this crop, variety, market, and date already exists." },
        { status: 409 }
      );
    }

    const existing = db.marketRates[index];
    const rate = {
      ...existing,
      ...input,
      status: existing.status === "PUBLISHED" ? "PUBLISHED" as const : input.status,
      updatedAt: new Date().toISOString(),
    };
    db.marketRates[index] = rate;
    await saveDb(db);
    return NextResponse.json({ success: true, rate });
  } catch (error: unknown) {
    console.error("PUT admin market rate failed:", error);
    const message = error instanceof Error ? error.message : "Unable to update market rate.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ rateId: string }> }
) {
  try {
    const db = await getDb();
    if (!isAdminRequest(request, db)) return unauthorizedAdminResponse();
    const { rateId } = await params;
    const index = (db.marketRates || []).findIndex((rate) => rate.id === rateId);
    if (index < 0) {
      return NextResponse.json({ success: false, message: "Market rate not found." }, { status: 404 });
    }
    if (db.marketRates[index].status === "PUBLISHED") {
      return NextResponse.json(
        { success: false, message: "Published rates are preserved in history and cannot be deleted." },
        { status: 409 }
      );
    }
    db.marketRates.splice(index, 1);
    await saveDb(db);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("DELETE admin market rate failed:", error);
    const message = error instanceof Error ? error.message : "Unable to delete draft.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
