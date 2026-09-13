import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import CoverLetter from "@/lib/models/CoverLetter";
import { getMongoUserId } from "@/lib/utils/userHelper";
import mongoose from "mongoose";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ letterId: string }> }
) {
  try {
    await connectDB();
    const authResult = await protect(request);
    if (authResult instanceof NextResponse) return authResult;

    const { letterId } = await params;

    if (!mongoose.Types.ObjectId.isValid(letterId)) {
      return NextResponse.json({ message: "Invalid cover letter ID." }, { status: 400 });
    }

    let letter;
    try {
      const userId = await getMongoUserId(authResult.userId);
      letter = await CoverLetter.findOne({ _id: letterId, userId });
    } catch {
      return NextResponse.json({ message: "Database unavailable. Please try again." }, { status: 503 });
    }

    if (!letter) {
      return NextResponse.json({ message: "Cover letter not found." }, { status: 404 });
    }

    await CoverLetter.deleteOne({ _id: letter._id });
    return NextResponse.json({ message: "Cover letter deleted successfully." });
  } catch (error: any) {
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
