import { NextResponse } from "next/server";
import { getDb, saveDb, toPublicFarmer } from "@/lib/db";
import { isAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
import { updateScheduleProgressStatuses } from "@/lib/schedule-progress";

export async function GET(request: Request) {
  try {
    const db = await getDb();
    if (!isAdminRequest(request, db)) return unauthorizedAdminResponse();
    if (updateScheduleProgressStatuses(db.scheduleProgress, db.farmers)) {
      await saveDb(db);
    }
    const { admin, farmers, ...data } = db;
    return NextResponse.json({
      success: true,
      data: {
        ...data,
        admin: { email: admin.email },
        farmers: farmers.map(toPublicFarmer),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const db = await getDb();
    if (!isAdminRequest(req, db)) return unauthorizedAdminResponse();
    const body = await req.json();
    await saveDb(body);
    return NextResponse.json({ success: true, message: "Database updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
