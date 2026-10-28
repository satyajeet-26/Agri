import { NextResponse } from "next/server";
import { getDb, saveDb } from "@/lib/db";

export async function GET() {
  try {
    const db = await getDb();
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load general masters.";
    console.error("GET /api/masters/general failed:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = await getDb();
    const { section, data } = body;

    if (["states", "districts", "talukas", "villages"].includes(section)) {
      if (
        !Array.isArray(data) ||
        data.some((item) =>
          !item ||
          typeof item.id !== "string" ||
          typeof item.name !== "string" ||
          !item.name.trim()
        )
      ) {
        return NextResponse.json(
          { success: false, error: "Each location must have an ID and a name." },
          { status: 400 }
        );
      }

      if (section === "states") {
        db.states = data;
      } else if (section === "districts") {
        if (data.some((item) => typeof item.stateId !== "string" || !db.states.some((state) => state.id === item.stateId))) {
          return NextResponse.json({ success: false, error: "Each district must belong to a saved state." }, { status: 400 });
        }
        db.districts = data;
      } else if (section === "talukas") {
        if (data.some((item) => typeof item.districtId !== "string" || !db.districts.some((district) => district.id === item.districtId))) {
          return NextResponse.json({ success: false, error: "Each taluka must belong to a saved district." }, { status: 400 });
        }
        db.talukas = data;
      } else {
        if (data.some((item) => typeof item.talukaId !== "string" || !db.talukas.some((taluka) => taluka.id === item.talukaId))) {
          return NextResponse.json({ success: false, error: "Each village must belong to a saved taluka." }, { status: 400 });
        }
        db.villages = data;
      }
    } else if (section === "shop") {
      db.shop = { ...db.shop, ...data };
    } else if (section === "admin_login") {
      if (data.email) db.admin.email = data.email;
      if (data.password) db.admin.passwordHash = data.password;
    } else if (section === "years") {
      db.years = data;
    } else if (section === "units") {
      db.units = data;
    }

    await saveDb(db);

    return NextResponse.json({
      success: true,
      message: `General Master ${section} updated successfully`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update general masters.";
    console.error("POST /api/masters/general failed:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { section, id } = body;
    if (
      !["states", "districts", "talukas", "villages"].includes(section) ||
      typeof id !== "string" ||
      !id
    ) {
      return NextResponse.json(
        { success: false, error: "A valid location section and ID are required." },
        { status: 400 }
      );
    }

    const db = await getDb();
    if (section === "states") {
      if (!db.states.some((state) => state.id === id)) {
        return NextResponse.json({ success: false, error: "State not found." }, { status: 404 });
      }
      const districtIds = new Set(
        db.districts.filter((district) => district.stateId === id).map((district) => district.id)
      );
      const talukaIds = new Set(
        db.talukas.filter((taluka) => districtIds.has(taluka.districtId)).map((taluka) => taluka.id)
      );
      db.states = db.states.filter((state) => state.id !== id);
      db.districts = db.districts.filter((district) => !districtIds.has(district.id));
      db.talukas = db.talukas.filter((taluka) => !talukaIds.has(taluka.id));
      db.villages = db.villages.filter((village) => !talukaIds.has(village.talukaId));
    } else if (section === "districts") {
      if (!db.districts.some((district) => district.id === id)) {
        return NextResponse.json({ success: false, error: "District not found." }, { status: 404 });
      }
      const talukaIds = new Set(
        db.talukas.filter((taluka) => taluka.districtId === id).map((taluka) => taluka.id)
      );
      db.districts = db.districts.filter((district) => district.id !== id);
      db.talukas = db.talukas.filter((taluka) => !talukaIds.has(taluka.id));
      db.villages = db.villages.filter((village) => !talukaIds.has(village.talukaId));
    } else if (section === "talukas") {
      if (!db.talukas.some((taluka) => taluka.id === id)) {
        return NextResponse.json({ success: false, error: "Taluka not found." }, { status: 404 });
      }
      db.talukas = db.talukas.filter((taluka) => taluka.id !== id);
      db.villages = db.villages.filter((village) => village.talukaId !== id);
    } else {
      if (!db.villages.some((village) => village.id === id)) {
        return NextResponse.json({ success: false, error: "Village not found." }, { status: 404 });
      }
      db.villages = db.villages.filter((village) => village.id !== id);
    }

    await saveDb(db);
    return NextResponse.json({
      success: true,
      message: "Location deleted.",
      data: {
        states: db.states,
        districts: db.districts,
        talukas: db.talukas,
        villages: db.villages,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete location.";
    console.error("DELETE /api/masters/general failed:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
