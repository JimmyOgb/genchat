import { NextRequest, NextResponse } from "next/server";
import { extractDocumentContent } from "@/lib/documents/extractor";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const maxSizeBytes = 10 * 1024 * 1024; // 10MB limit
    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        { error: "File exceeds 10MB size limit" },
        { status: 400 }
      );
    }

    const doc = await extractDocumentContent(file);

    return NextResponse.json({
      success: true,
      document: doc,
    });
  } catch (err: any) {
    console.error("Document processing error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process document" },
      { status: 500 }
    );
  }
}
