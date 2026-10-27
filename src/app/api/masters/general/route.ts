import { NextResponse } from "next/server";
import { getDb, saveDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    return NextResponse.json({
      success: true,
      data: {
        shop: db.shop,
        admin: { email: db.admin.email },
        years: db.years,
        units: db.units,
        states: db.states,
        districts: db.districts,
        talukas: db.talukas,
        villages: db.villages,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = getDb();
    const { section, data } = body;

    if (section === "shop") {
      db.shop = { ...db.shop, ...data };
    } else if (section === "admin_login") {
      if (data.email) db.admin.email = data.email;
      if (data.password) db.admin.passwordHash = data.password;
    } else if (section === "years") {
      db.years = data;
    } else if (section === "units") {
      db.units = data;
    } else if (section === "states") {
      db.states = data;
    } else if (section === "districts") {
      db.districts = data;
    } else if (section === "talukas") {
      db.talukas = data;
    } else if (section === "villages") {
      db.villages = data;
    }

    saveDb(db);

    return NextResponse.json({
      success: true,
      message: `General Master ${section} updated successfully`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

