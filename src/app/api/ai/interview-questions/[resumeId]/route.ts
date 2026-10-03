import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import { getInterviewHistory } from "@/lib/services/interviewService";
import { ServiceError } from "@/lib/services/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resumeId: string }> }
) {
  try {
    await connectDB();
    const authResult = await protect(request);
    if (authResult instanceof NextResponse) return authResult;

    const { resumeId } = await params;
    const result = await getInterviewHistory(authResult.userId, resumeId);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
