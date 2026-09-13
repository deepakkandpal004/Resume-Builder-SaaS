import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "../config/firebase";

export async function protect(request: NextRequest) {
  let token = request.headers.get("authorization");

  if (!token) {
    console.warn(
      `[Auth Middleware] ⚠️ Unauthorized: Missing 'Authorization' header for ${request.method} ${request.nextUrl.pathname}`,
    );

    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  if (token.startsWith("Bearer ")) {
    token = token.slice(7);
  }

  try {
    const decoded = await verifyIdToken(token);

    console.log(
      `[Auth Middleware] ✅ Authorized: UID ${decoded.uid} for ${request.method} ${request.nextUrl.pathname}`,
    );

    return {
      userId: decoded.uid,
      firebaseUser: decoded,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";

    console.error(
      `[Auth Middleware] ❌ Unauthorized: Invalid token for ${request.method} ${request.nextUrl.pathname}:`,
      message,
    );

    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }
}
