import { NextResponse } from "next/server";
import { saveDb } from "@/lib/db";
import {
  authorizeDiaryRequest,
  DiaryValidationError,
  parseDiaryEntryInput,
  readDiaryRequestBody,
} from "@/lib/farm-diary";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { id, entryId } = await params;
    const result = await authorizeDiaryRequest(request, id);
    if ("response" in result) return result.response;
    if (result.isAdmin) {
      return NextResponse.json(
        { success: false, message: "Only the farmer can edit diary entries." },
        { status: 403 }
      );
    }

    const body = await readDiaryRequestBody(request);
    const entryIndex = result.db.farmDiaryEntries.findIndex(
      (entry) => entry.id === entryId && entry.farmerId === id
    );
    if (entryIndex < 0) {
      return NextResponse.json({ success: false, message: "Diary entry not found." }, { status: 404 });
    }
    const input = parseDiaryEntryInput(body);
    const plot = result.farmer.plots.find((entry) => entry.id === input.plotId);
    if (!plot) {
      return NextResponse.json(
        { success: false, message: "Choose a plot that belongs to your account." },
        { status: 400 }
      );
    }

    const currentEntry = result.db.farmDiaryEntries[entryIndex];
    const removePhoto =
      typeof body === "object" &&
      body !== null &&
      !Array.isArray(body) &&
      (body as Record<string, unknown>).removePhoto === true;
    const entry = {
      ...currentEntry,
      ...input,
      cropName: plot.cropName,
      totalExpense:
        Math.round(
          (input.labourCost + input.productCost + input.otherExpenses + Number.EPSILON) * 100
        ) / 100,
      photoDataUrl: input.photoDataUrl ?? (removePhoto ? undefined : currentEntry.photoDataUrl),
      updatedAt: new Date().toISOString(),
    };
    result.db.farmDiaryEntries[entryIndex] = entry;
    await saveDb(result.db);
    return NextResponse.json({ success: true, entry });
  } catch (error: unknown) {
    console.error("PUT farmer diary entry failed:", error);
    const message = error instanceof Error ? error.message : "Unable to update diary entry.";
    return NextResponse.json(
      { success: false, message },
      { status: error instanceof DiaryValidationError ? 400 : 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { id, entryId } = await params;
    const result = await authorizeDiaryRequest(request, id);
    if ("response" in result) return result.response;
    if (result.isAdmin) {
      return NextResponse.json(
        { success: false, message: "Only the farmer can delete diary entries." },
        { status: 403 }
      );
    }

    const entryIndex = result.db.farmDiaryEntries.findIndex(
      (entry) => entry.id === entryId && entry.farmerId === id
    );
    if (entryIndex < 0) {
      return NextResponse.json({ success: false, message: "Diary entry not found." }, { status: 404 });
    }

    result.db.farmDiaryEntries.splice(entryIndex, 1);
    await saveDb(result.db);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("DELETE farmer diary entry failed:", error);
    const message = error instanceof Error ? error.message : "Unable to delete diary entry.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
