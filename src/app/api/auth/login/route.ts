import { NextResponse } from "next/server";
import { getDb, saveDb } from "@/lib/db";
import {
  clearAdminSessionCookie,
  ADMIN_SESSION_COOKIE,
  setAdminSessionCookie,
} from "@/lib/admin-auth";
import {
  clearFarmerSessionCookie,
  setFarmerSessionCookie,
} from "@/lib/farmer-auth";
import {
  farmerScheduleView,
  updateScheduleProgressStatuses,
} from "@/lib/schedule-progress";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const role = body?.role;

    if (!username || !password) {
      const response = NextResponse.json(
        { success: false, message: "Username and password are required" },
        { status: 400 }
      );
      clearAdminSessionCookie(response);
      clearFarmerSessionCookie(response);
      return response;
    }

    const db = await getDb();

    // Admin login
    if (role === "ADMIN" || username.includes("@")) {
      if (
        (username.toLowerCase() === db.admin.email.toLowerCase() || username.toLowerCase() === "admin") &&
        password === db.admin.passwordHash
      ) {
        const response = NextResponse.json({
          success: true,
          role: "ADMIN",
          user: {
            email: db.admin.email,
            name: db.shop.ownerName || "Admin",
            shopName: db.shop.name,
          },
        });
        setAdminSessionCookie(response, db);
        clearFarmerSessionCookie(response);
        console.info("Admin login session cookie created.", {
          hostname: new URL(req.url).hostname,
          path: new URL(req.url).pathname,
          cookieName: ADMIN_SESSION_COOKIE,
          setCookieGenerated: response.headers.has("set-cookie"),
        });
        return response;
      }
      const response = NextResponse.json(
        { success: false, message: "Invalid Admin email or password" },
        { status: 401 }
      );
      clearAdminSessionCookie(response);
      clearFarmerSessionCookie(response);
      return response;
    }

    // Farmer login
    const farmer = db.farmers.find(
      (f) =>
        f.username.toLowerCase() === username.toLowerCase() ||
        f.mobile === username.trim()
    );

    if (farmer && (farmer.passwordHash === password || farmer.plainPassword === password)) {
      if (!farmer.isActive) {
        const response = NextResponse.json(
          { success: false, message: "Your account is inactive. Please contact Bharathi Krushi Seva Kendra." },
          { status: 403 }
        );
        clearAdminSessionCookie(response);
        clearFarmerSessionCookie(response);
        return response;
      }

      if (updateScheduleProgressStatuses(db.scheduleProgress, db.farmers)) {
        await saveDb(db);
      }

      const response = NextResponse.json({
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
          plots: farmerScheduleView(farmer, db.scheduleProgress).plots,
        },
      });
      clearAdminSessionCookie(response);
      setFarmerSessionCookie(response, farmer.id, db);
      return response;
    }

    const response = NextResponse.json(
      { success: false, message: "Invalid Farmer username or password" },
      { status: 401 }
    );
    clearAdminSessionCookie(response);
    clearFarmerSessionCookie(response);
    return response;
  } catch (error: unknown) {
    console.error("Login request failed:", error);
    const message = error instanceof Error ? error.message : "Login service is unavailable.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
