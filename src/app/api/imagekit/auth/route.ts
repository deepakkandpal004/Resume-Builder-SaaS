import { NextRequest, NextResponse } from "next/server";
import { protect } from "@/lib/middlewares/auth";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  try {
    const authResult = await protect(request);
    if (authResult instanceof NextResponse) return authResult;

    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json({ message: "IMAGEKIT_PRIVATE_KEY is not set" }, { status: 500 });
    }

    const token = crypto.randomUUID();
    const expire = Math.floor(Date.now() / 1000) + 300;
    const signature = crypto
      .createHmac("sha1", privateKey)
      .update(token + expire)
      .digest("hex");

    return NextResponse.json({ token, expire, signature });
  } catch {
    return NextResponse.json({ message: "Failed to generate ImageKit auth token" }, { status: 500 });
  }
}
