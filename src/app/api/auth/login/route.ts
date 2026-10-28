import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { username, password, role } = await req.json();

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
        f.username.toLowerCase() === username.toLowerCase().trim() ||
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
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
