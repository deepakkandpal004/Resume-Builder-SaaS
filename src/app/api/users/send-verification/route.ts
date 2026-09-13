import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json().catch(() => ({}));
    console.log(`[API /api/users/send-verification] Verification request for: ${email}`);
    return NextResponse.json({ message: "Verification requested" });
  } catch (error: any) {
    console.error("[API /api/users/send-verification Error]:", error);
    return NextResponse.json({ message: "Failed" }, { status: 500 });
  }
}
