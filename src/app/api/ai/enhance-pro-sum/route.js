import { NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import { checkQuota } from "@/lib/middlewares/quota";
import { enhanceProfessionalSummary } from "@/lib/services/enhanceService";
import { ServiceError } from "@/lib/services/errors";
export async function POST(request) {
    try {
        await connectDB();
        const authResult = await protect(request);
        if (authResult instanceof NextResponse)
            return authResult;
        const quotaResult = await checkQuota(request, authResult.userId, "enhance", 10);
        if (quotaResult.error) {
            return NextResponse.json({ message: quotaResult.message }, { status: quotaResult.status });
        }
        const { userContent } = await request.json();
        const enhancedContent = await enhanceProfessionalSummary(userContent);
        return NextResponse.json({ enhancedContent });
    }
    catch (error) {
        if (error instanceof ServiceError) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }
        return NextResponse.json({ message: "AI service error. Please try again." }, { status: 500 });
    }
}
