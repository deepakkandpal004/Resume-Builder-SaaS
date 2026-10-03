import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import { toggleShare } from "@/lib/services/resumeService";
import { ServiceError } from "@/lib/services/errors";

// Toggle public link sharing for one of the user's own resumes.
// When `share` is true, the resume becomes viewable at /view/[resumeId]
// via the unauthenticated GET /api/resumes/public/[resumeId] endpoint.
// Turning it off instantly invalidates the link. No AI quota involved.
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const authResult = await protect(request);
    if (authResult instanceof NextResponse) return authResult;

    const { resumeId, share } = await request.json();
    const result = await toggleShare(authResult.userId, { resumeId, share });
    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
