import { NextResponse } from "next/server";
import { getDb, saveDb } from "@/lib/db";
import { isAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
import { validateMarketRateInput } from "@/lib/market-rates";
import { MarketRate } from "@/types";

export async function GET(request: Request) {
  try {
    const db = await getDb();
    if (!isAdminRequest(request, db)) return unauthorizedAdminResponse();

    const cropNames = new Set([
      ...Object.keys(db.masterSchedules || {}),
      ...(db.farmers || []).flatMap((farmer) =>
        (farmer.plots || []).map((plot) => plot.cropName)
      ),
      ...(db.marketRates || []).map((rate) => rate.cropName),
    ]);

    return NextResponse.json({
      success: true,
      rates: [...(db.marketRates || [])].sort(
        (a, b) => b.rateDate.localeCompare(a.rateDate) || b.updatedAt.localeCompare(a.updatedAt)
      ),
      states: db.states || [],
      districts: db.districts || [],
      crops: [...cropNames].filter(Boolean).sort((a, b) => a.localeCompare(b)),
      markets: [...new Set((db.marketRates || []).map((rate) => rate.marketName))].sort(),
      varieties: [...new Set((db.marketRates || []).map((rate) => rate.cropVariety))].sort(),
    });
  } catch (error: unknown) {
    console.error("GET admin market rates failed:", error);
    const message = error instanceof Error ? error.message : "Unable to load market rates.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = await getDb();
    if (!isAdminRequest(request, db)) return unauthorizedAdminResponse();

    const validation = validateMarketRateInput(await request.json());
    if ("error" in validation) {
      return NextResponse.json({ success: false, message: validation.error }, { status: 400 });
    }

    const input = validation.input;
    const duplicate = (db.marketRates || []).find(
      (rate) =>
        rate.rateDate === input.rateDate &&
        rate.state.toLocaleLowerCase() === input.state.toLocaleLowerCase() &&
        rate.district.toLocaleLowerCase() === input.district.toLocaleLowerCase() &&
        rate.marketName.toLocaleLowerCase() === input.marketName.toLocaleLowerCase() &&
        rate.cropName.toLocaleLowerCase() === input.cropName.toLocaleLowerCase() &&
        rate.cropVariety.toLocaleLowerCase() === input.cropVariety.toLocaleLowerCase()
    );
    if (duplicate) {
      return NextResponse.json(
        { success: false, message: "A rate for this crop, variety, market, and date already exists. Edit that rate instead." },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const rate: MarketRate = {
      ...input,
      id: `mr-${globalThis.crypto.randomUUID()}`,
      createdByAdmin: db.admin.email,
      createdAt: now,
      updatedAt: now,
    };
    db.marketRates.push(rate);
    await saveDb(db);
    return NextResponse.json({ success: true, rate }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST admin market rate failed:", error);
    const message = error instanceof Error ? error.message : "Unable to save market rate.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
