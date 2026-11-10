import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isFarmerRequest } from "@/lib/farmer-auth";
import { isValidRateDate } from "@/lib/market-rates";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();
    if (!isFarmerRequest(request, id, db)) {
      return NextResponse.json(
        { success: false, message: "Farmer authentication is required." },
        { status: 401 }
      );
    }
    if (!db.farmers.some((farmer) => farmer.id === id && farmer.isActive)) {
      return NextResponse.json(
        { success: false, message: "Active farmer account not found." },
        { status: 404 }
      );
    }

    const query = new URL(request.url).searchParams;
    const date = query.get("date");
    if (date && !isValidRateDate(date)) {
      return NextResponse.json(
        { success: false, message: "Select a valid market rate date." },
        { status: 400 }
      );
    }
    const rates = (db.marketRates || [])
      .filter((rate) => rate.status === "PUBLISHED" && (!date || rate.rateDate === date))
      .sort((a, b) => b.rateDate.localeCompare(a.rateDate) || b.updatedAt.localeCompare(a.updatedAt))
      .map((rate) => ({
        id: rate.id,
        cropName: rate.cropName,
        cropVariety: rate.cropVariety,
        state: rate.state,
        district: rate.district,
        marketName: rate.marketName,
        minimumPrice: rate.minimumPrice,
        maximumPrice: rate.maximumPrice,
        modalPrice: rate.modalPrice,
        arrivalQuantity: rate.arrivalQuantity,
        rateDate: rate.rateDate,
        status: rate.status,
        createdAt: rate.createdAt,
        updatedAt: rate.updatedAt,
      }));
    return NextResponse.json({ success: true, rates });
  } catch (error: unknown) {
    console.error("GET farmer market rates failed:", error);
    const message = error instanceof Error ? error.message : "Unable to load market rates.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
