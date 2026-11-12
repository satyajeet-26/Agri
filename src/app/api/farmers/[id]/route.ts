import { NextResponse } from "next/server";
import { getDb, saveDb, cloneMasterScheduleForPlot, toPublicFarmer } from "@/lib/db";
import { calculateTotalGuntha } from "@/lib/area";
import { isAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
import {
  farmerScheduleView,
  getScheduleDayNumber,
  updateScheduleProgressStatuses,
} from "@/lib/schedule-progress";
import { isFarmerRequest } from "@/lib/farmer-auth";
import { getDateInIndia } from "@/lib/schedule-date";
import {
  decryptAadhaarNumber,
  encryptAadhaarNumber,
  isValidFarmerPhotoDataUrl,
  normalizeAadhaarNumber,
} from "@/lib/farmer-private-data";
import { Plot } from "@/types";

type PlotUpdateInput = Pick<Plot, "plotName" | "cropName" | "sowingDate"> &
  Partial<
    Pick<
      Plot,
      | "id"
      | "isActive"
      | "areaAcre"
      | "areaGuntha"
      | "spraySchedule"
      | "fertilizerSchedule"
    >
  >;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "An unexpected error occurred.";
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();
    const isAdmin = isAdminRequest(req, db);
    if (!isAdmin && !isFarmerRequest(req, id, db)) {
      return Response.json(
        { success: false, message: "Authentication is required." },
        { status: 401 }
      );
    }

    const farmer = db.farmers.find((f) => f.id === id);

    if (!farmer) {
      return NextResponse.json({ success: false, message: "Farmer not found" }, { status: 404 });
    }

    if (updateScheduleProgressStatuses(db.scheduleProgress, db.farmers)) {
      await saveDb(db);
    }

    const publicFarmer = isAdmin
      ? {
          ...toPublicFarmer(farmer),
          aadhaarLastFour: farmer.aadhaarLastFour,
          aadhaarNumber: farmer.aadhaarEncrypted
            ? decryptAadhaarNumber(farmer.aadhaarEncrypted)
            : undefined,
          profilePhotoDataUrl: farmer.profilePhotoDataUrl,
        }
      : {
          ...toPublicFarmer(farmerScheduleView(farmer, db.scheduleProgress)),
          profilePhotoDataUrl: farmer.profilePhotoDataUrl,
        };
    const scheduleProgress = db.scheduleProgress.filter((entry) => entry.farmerId === id);
    const currentDate = getDateInIndia();
    const plotCurrentDays = Object.fromEntries(
      farmer.plots.map((plot) => {
        const progress = scheduleProgress.find(
          (entry) => entry.plotId === plot.id && entry.cropId === plot.cropName
        );
        return [
          plot.id,
          getScheduleDayNumber(progress?.scheduleStartDate || plot.sowingDate, currentDate),
        ];
      })
    );

    return NextResponse.json({
      success: true,
      farmer: publicFarmer,
      scheduleProgress,
      plotCurrentDays,
    });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();
    if (!isAdminRequest(req, db)) return unauthorizedAdminResponse();
    const body = await req.json();
    const index = db.farmers.findIndex((f) => f.id === id);

    if (index === -1) {
      return NextResponse.json({ success: false, message: "Farmer not found" }, { status: 404 });
    }

    const current = db.farmers[index];
    let updatedUsername = current.username;
    let updatedMobile = current.mobile;
    let updatedAadhaar = current.aadhaarEncrypted;
    let updatedAadhaarLastFour = current.aadhaarLastFour;
    let updatedProfilePhoto = current.profilePhotoDataUrl;
    if (body.username !== undefined) {
      if (typeof body.username !== "string" || !body.username.trim()) {
        return NextResponse.json(
          { success: false, message: "Farmer login ID is required." },
          { status: 400 }
        );
      }

      updatedUsername = body.username.trim();
      const normalizedUsername = updatedUsername.toLowerCase();
      const usernameInUse = db.farmers.some(
        (farmer, farmerIndex) =>
          farmerIndex !== index &&
          ((farmer.username || "").trim().toLowerCase() === normalizedUsername ||
            (farmer.mobile || "").trim().toLowerCase() === normalizedUsername)
      );
      if (usernameInUse) {
        return NextResponse.json(
          { success: false, message: "This login ID is already in use." },
          { status: 409 }
        );
      }
    }

    if (body.mobile !== undefined) {
      if (typeof body.mobile !== "string" || !body.mobile.trim()) {
        return NextResponse.json(
          { success: false, message: "Farmer mobile number is required." },
          { status: 400 }
        );
      }

      updatedMobile = body.mobile.trim();
      const normalizedMobile = updatedMobile.toLowerCase();
      const mobileInUse = db.farmers.some(
        (farmer, farmerIndex) =>
          farmerIndex !== index &&
          ((farmer.mobile || "").trim().toLowerCase() === normalizedMobile ||
            (farmer.username || "").trim().toLowerCase() === normalizedMobile)
      );
      if (mobileInUse) {
        return NextResponse.json(
          { success: false, message: "This mobile number is already in use." },
          { status: 409 }
        );
      }
    }

    if (
      body.password !== undefined &&
      (typeof body.password !== "string" || body.password.length === 0)
    ) {
      return NextResponse.json(
        { success: false, message: "A new password cannot be empty." },
        { status: 400 }
      );
    }

    if (body.aadhaarNumber !== undefined && body.aadhaarNumber !== "") {
      const aadhaarNumber = normalizeAadhaarNumber(body.aadhaarNumber);
      if (!aadhaarNumber) {
        return NextResponse.json(
          { success: false, message: "Enter a valid 12-digit Aadhaar number." },
          { status: 400 }
        );
      }
      updatedAadhaar = encryptAadhaarNumber(aadhaarNumber);
      updatedAadhaarLastFour = aadhaarNumber.slice(-4);
    }

    if (body.removeProfilePhoto === true) {
      updatedProfilePhoto = undefined;
    } else if (body.profilePhotoDataUrl !== undefined) {
      if (!isValidFarmerPhotoDataUrl(body.profilePhotoDataUrl)) {
        return NextResponse.json(
          { success: false, message: "Choose a valid JPG, PNG, or WebP photo up to 1 MB." },
          { status: 400 }
        );
      }
      updatedProfilePhoto = body.profilePhotoDataUrl;
    }

    // If updating plots
    let updatedPlots = current.plots;
    if (Array.isArray(body.plots)) {
      updatedPlots = body.plots.map((p: PlotUpdateInput) => {
        const existingPlot = current.plots.find((plot) => plot.id === p.id);
        const acre = Number(p.areaAcre) || 0;
        const guntha = Number(p.areaGuntha) || 0;
        const totalGuntha = calculateTotalGuntha(acre, guntha);

        // If this is a brand new plot without schedules, clone master
        let spray = p.spraySchedule;
        let fertilizer = p.fertilizerSchedule;

        if (!spray || spray.length === 0) {
          const cloned = cloneMasterScheduleForPlot(
            p.cropName,
            p.sowingDate,
            db.masterSchedules
          );
          spray = cloned.spray;
          fertilizer = cloned.fertilizer;
        }

        return {
          id: p.id || `plt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          plotName: p.plotName,
          isActive:
            typeof p.isActive === "boolean"
              ? p.isActive
              : existingPlot?.isActive !== false,
          cropName: p.cropName,
          sowingDate: p.sowingDate,
          areaAcre: acre,
          areaGuntha: guntha,
          totalGuntha,
          spraySchedule: spray,
          fertilizerSchedule: fertilizer,
        };
      });
    }

    db.farmers[index] = {
      ...current,
      name: body.name ?? current.name,
      mobile: updatedMobile,
      whatsapp: body.whatsapp ?? current.whatsapp,
      openingBalanceType: body.openingBalanceType ?? current.openingBalanceType,
      openingBalance: body.openingBalance !== undefined ? Number(body.openingBalance) : current.openingBalance,
      registrationDate: body.registrationDate ?? current.registrationDate,
      state: body.state ?? current.state,
      district: body.district ?? current.district,
      taluka: body.taluka ?? current.taluka,
      village: body.village ?? current.village,
      username: updatedUsername,
      passwordHash: body.password ?? current.passwordHash,
      plainPassword: body.password ?? current.plainPassword,
      aadhaarEncrypted: updatedAadhaar,
      aadhaarLastFour: updatedAadhaarLastFour,
      profilePhotoDataUrl: updatedProfilePhoto,
      isActive: body.isActive !== undefined ? body.isActive : current.isActive,
      plots: updatedPlots,
    };

    await saveDb(db);

    return NextResponse.json({
      success: true,
      message: "Farmer updated successfully",
      farmer: {
        ...toPublicFarmer(db.farmers[index]),
        aadhaarLastFour: db.farmers[index].aadhaarLastFour,
        profilePhotoDataUrl: db.farmers[index].profilePhotoDataUrl,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();
    if (!isAdminRequest(req, db)) return unauthorizedAdminResponse();
    const index = db.farmers.findIndex((f) => f.id === id);

    if (index === -1) {
      return NextResponse.json({ success: false, message: "Farmer not found" }, { status: 404 });
    }

    db.farmers.splice(index, 1);
    await saveDb(db);

    return NextResponse.json({ success: true, message: "Farmer deleted successfully" });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
  }
}
