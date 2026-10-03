import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import { checkQuota } from "@/lib/middlewares/quota";
import { suggestSkills } from "@/lib/services/enhanceService";
import { ServiceError } from "@/lib/services/errors";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const authResult = await protect(request);
    if (authResult instanceof NextResponse) return authResult;

    const quotaResult = await checkQuota(request, authResult.userId, "suggestSkills", 5);
    if (quotaResult.error) {
      return NextResponse.json({ message: quotaResult.message }, { status: quotaResult.status });
    }

    const { targetRole, currentSkills } = await request.json();
    const suggestedSkills = await suggestSkills({ targetRole, currentSkills });
    return NextResponse.json({ suggestedSkills });
  } catch (error: any) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "AI service error. Please try again." }, { status: 500 });
  }
}
