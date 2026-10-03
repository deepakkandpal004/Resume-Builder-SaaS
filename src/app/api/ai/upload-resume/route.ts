import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import { checkQuota } from "@/lib/middlewares/quota";
import { parseUploadInput, importResumeFromText } from "@/lib/services/resumeService";
import { ServiceError } from "@/lib/services/errors";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const authResult = await protect(request);
    if (authResult instanceof NextResponse) return authResult;

    // Validate input BEFORE touching quota — bad input must not burn quota.
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
    }
    let input;
    try {
      input = parseUploadInput(body);
    } catch (error: any) {
      if (error instanceof ServiceError) {
        return NextResponse.json({ message: error.message }, { status: error.status });
      }
      throw error;
    }

    const quotaResult = await checkQuota(request, authResult.userId, "uploadResume", 10);
    if (quotaResult.error) {
      return NextResponse.json({ message: quotaResult.message }, { status: quotaResult.status });
    }

    const result = await importResumeFromText(authResult.userId, input);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "AI service error. Please try again." }, { status: 500 });
  }
}
