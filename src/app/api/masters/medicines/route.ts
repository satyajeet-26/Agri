import { NextResponse } from "next/server";
import { getDb, saveDb } from "@/lib/db";

export async function GET() {
  try {
    const db = await getDb();
    return NextResponse.json({
      success: true,
      data: {
        medicineCompanies: db.medicineCompanies,
        medicineCategories: db.medicineCategories,
        medicines: db.medicines,
        fertilizers: db.fertilizers,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = await getDb();
    const { section, data } = body;

    if (section === "companies") {
      db.medicineCompanies = data;
    } else if (section === "categories") {
      db.medicineCategories = data;
    } else if (section === "medicines") {
      db.medicines = data;
    } else if (section === "fertilizers") {
      db.fertilizers = data;
    }

    await saveDb(db);

    return NextResponse.json({
      success: true,
      message: `Medicine Master ${section} updated successfully`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
