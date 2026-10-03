import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import { deleteCoverLetter } from "@/lib/services/coverLetterService";
import { ServiceError } from "@/lib/services/errors";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ letterId: string }> }
) {
  try {
    await connectDB();
    const authResult = await protect(request);
    if (authResult instanceof NextResponse) return authResult;

    const { letterId } = await params;
    const result = await deleteCoverLetter(authResult.userId, letterId);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
