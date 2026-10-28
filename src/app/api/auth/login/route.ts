import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const role = body?.role;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "Username and password are required" },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Admin login
    if (role === "ADMIN" || username.includes("@")) {
      if (
        (username.toLowerCase() === db.admin.email.toLowerCase() || username.toLowerCase() === "admin") &&
        password === db.admin.passwordHash
      ) {
        return NextResponse.json({
          success: true,
          role: "ADMIN",
          user: {
            email: db.admin.email,
            name: db.shop.ownerName || "Admin",
            shopName: db.shop.name,
          },
        });
      }
      return NextResponse.json(
        { success: false, message: "Invalid Admin email or password" },
        { status: 401 }
      );
    }

    // Farmer login
    const farmer = db.farmers.find(
      (f) =>
        f.username.toLowerCase() === username.toLowerCase() ||
        f.mobile === username.trim()
    );

    if (farmer && (farmer.passwordHash === password || farmer.plainPassword === password)) {
      if (!farmer.isActive) {
        return NextResponse.json(
          { success: false, message: "Your account is inactive. Please contact Krushi Seva Kendra." },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        role: "FARMER",
        user: {
          id: farmer.id,
          name: farmer.name,
          mobile: farmer.mobile,
          whatsapp: farmer.whatsapp,
          village: farmer.village,
          taluka: farmer.taluka,
          district: farmer.district,
          plots: farmer.plots,
        },
      });
    }

    return NextResponse.json(
      { success: false, message: "Invalid Farmer username or password" },
      { status: 401 }
    );
  } catch (error: unknown) {
    console.error("Login request failed:", error);
    const message = error instanceof Error ? error.message : "Login service is unavailable.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
