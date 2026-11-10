import { NextResponse } from "next/server";
import { saveDb } from "@/lib/db";
import {
  authorizeDiaryRequest,
  createDiaryEntry,
  DiaryValidationError,
  parseDiaryEntryInput,
  readDiaryRequestBody,
} from "@/lib/farm-diary";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await authorizeDiaryRequest(request, id);
    if ("response" in result) return result.response;
    const entries = result.db.farmDiaryEntries
      .filter((entry) => entry.farmerId === id)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    const visibleEntries = result.isAdmin
      ? entries.map((entry) => {
          const visibleEntry = { ...entry };
          delete visibleEntry.photoDataUrl;
          return visibleEntry;
        })
      : entries;
    return NextResponse.json({ success: true, entries: visibleEntries });
  } catch (error: unknown) {
    console.error("GET farmer diary failed:", error);
    const message = error instanceof Error ? error.message : "Unable to load farm diary.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await authorizeDiaryRequest(request, id);
    if ("response" in result) return result.response;
    if (result.isAdmin) {
      return NextResponse.json(
        { success: false, message: "Farmers must create their own diary entries." },
        { status: 403 }
      );
    }

    const input = parseDiaryEntryInput(await readDiaryRequestBody(request));
    const plot = result.farmer.plots.find((entry) => entry.id === input.plotId);
    if (!plot) {
      return NextResponse.json(
        { success: false, message: "Choose a plot that belongs to your account." },
        { status: 400 }
      );
    }

    const entry = createDiaryEntry(input, id, plot.cropName);
    result.db.farmDiaryEntries.push(entry);
    await saveDb(result.db);
    return NextResponse.json({ success: true, entry }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST farmer diary entry failed:", error);
    const message = error instanceof Error ? error.message : "Unable to save diary entry.";
    return NextResponse.json(
      { success: false, message },
      { status: error instanceof DiaryValidationError ? 400 : 500 }
    );
  }
}
