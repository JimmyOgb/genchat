import { NextRequest, NextResponse } from "next/server";
import { GenLayerVerifierService } from "@/lib/genlayer/verifier";
import { getExplorerUrl } from "@/lib/genlayer/client";
import type { VerificationRequest } from "@/lib/genlayer/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, request, verificationId } = body;

    const verifier = new GenLayerVerifierService();

    if (!verifier.isConfigured()) {
      return NextResponse.json(
        {
          error:
            "GENCHAT_CONTRACT_ADDRESS is not configured in server environment. Please set GENCHAT_CONTRACT_ADDRESS.",
          configured: false,
        },
        { status: 503 }
      );
    }

    if (action === "submit") {
      if (!request) {
        return NextResponse.json({ error: "Missing verification request" }, { status: 400 });
      }

      const receipt = await verifier.submitVerification(request as VerificationRequest);
      return NextResponse.json({
        success: true,
        receipt,
        explorerUrl: getExplorerUrl(receipt.transactionHash),
      });
    }

    if (action === "get") {
      if (!verificationId) {
        return NextResponse.json({ error: "Missing verificationId" }, { status: 400 });
      }

      const record = await verifier.getVerificationRecord(verificationId);
      return NextResponse.json({
        success: true,
        record,
      });
    }

    if (action === "get_text") {
      if (!verificationId) {
        return NextResponse.json({ error: "Missing verificationId" }, { status: 400 });
      }

      const text = await verifier.getVerificationText(verificationId);
      return NextResponse.json({
        success: true,
        text,
      });
    }

    if (action === "get_decision") {
      if (!verificationId) {
        return NextResponse.json({ error: "Missing verificationId" }, { status: 400 });
      }

      const decision = await verifier.getVerificationDecision(verificationId);
      return NextResponse.json({
        success: true,
        decision,
      });
    }

    if (action === "count") {
      const count = await verifier.getVerificationCount();
      return NextResponse.json({
        success: true,
        count,
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error("Verification API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to execute GenLayer verification request" },
      { status: 500 }
    );
  }
}
