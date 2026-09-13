import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email, name, via } = await request.json().catch(() => ({}));
    console.log(`[API /api/users/send-login-notification] Login notification: ${email} (${name || "User"}) via ${via}`);
    return NextResponse.json({ message: "Notification received" });
  } catch (error: any) {
    console.error("[API /api/users/send-login-notification Error]:", error);
    return NextResponse.json({ message: "Failed" }, { status: 500 });
  }
}
