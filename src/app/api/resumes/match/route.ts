import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import { checkQuota } from "@/lib/middlewares/quota";
import { parseMatchInput, matchResumes } from "@/lib/services/matcherService";
import { ServiceError } from "@/lib/services/errors";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const authResult = await protect(request);
    if (authResult instanceof NextResponse) return authResult;

    // Validate input before claiming quota so bad requests don't burn it.
    const { jobText, jobUrl } = await request.json();
    const input = parseMatchInput({ jobText, jobUrl });

    const quotaResult = await checkQuota(request, authResult.userId, "match", 10);
    if (quotaResult.error) {
      return NextResponse.json({ message: quotaResult.message }, { status: quotaResult.status });
    }

    const result = await matchResumes(authResult.userId, input);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
