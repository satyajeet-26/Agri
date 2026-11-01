import { NextResponse } from "next/server";
import { clearAdminSessionCookie } from "@/lib/admin-auth";
import { clearFarmerSessionCookie } from "@/lib/farmer-auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  clearAdminSessionCookie(response);
  clearFarmerSessionCookie(response);
  return response;
}
