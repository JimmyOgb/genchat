import { NextRequest, NextResponse } from "next/server";
import { GenLayerVerifierService } from "@/lib/genlayer/verifier";
import { validateGenLayerConfig } from "@/lib/genlayer/client";
import { buildRequestArgs, REQUEST_VERIFICATION_PARAMS } from "@/lib/genlayer/protocol";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, request, verificationId } = body;

    const config = validateGenLayerConfig();
    if (!config.isValid) {
      return NextResponse.json(
        {
          error: config.error || "GenChat contract configuration is invalid.",
          configured: false,
        },
        { status: 503 }
      );
    }

    const verifier = new GenLayerVerifierService();

    if (action === "submit") {
      // The server does NOT hold user wallet keys and cannot sign blockchain transactions.
      // Honest response explaining that wallet account in the browser is required.
      return NextResponse.json(
        {
          success: false,
          error:
            "Wallet account is required to submit a GenLayer verification. Transactions must be signed by the user's connected wallet in the browser.",
        },
        { status: 400 }
      );
    }

    if (action === "prepare") {
      if (!request) {
        return NextResponse.json(
          { success: false, error: "Missing verification request" },
          { status: 400 }
        );
      }
      let args: string[];
      try {
        args = buildRequestArgs(request);
      } catch (validationErr: any) {
        return NextResponse.json(
          { success: false, error: validationErr.message },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        contractAddress: verifier.getContractAddress(),
        method: "request_verification",
        params: REQUEST_VERIFICATION_PARAMS,
        args,
        prepared: true,
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
