import { NextResponse } from "next/server";
import { getDb, saveDb, toPublicFarmer } from "@/lib/db";

export async function GET() {
  try {
    const db = await getDb();
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
    const body = await req.json();
    await saveDb(body);
    return NextResponse.json({ success: true, message: "Database updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
