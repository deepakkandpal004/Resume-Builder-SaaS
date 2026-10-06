import { NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import { checkQuota } from "@/lib/middlewares/quota";
import { tailorResume } from "@/lib/services/tailorService";
import { ServiceError } from "@/lib/services/errors";
export async function POST(request) {
    try {
        await connectDB();
        const authResult = await protect(request);
        if (authResult instanceof NextResponse)
            return authResult;
        const quotaResult = await checkQuota(request, authResult.userId, "tailor", 3);
        if (quotaResult.error) {
            return NextResponse.json({ message: quotaResult.message }, { status: quotaResult.status });
        }
        const { resumeId, jobDescription } = await request.json();
        const result = await tailorResume(authResult.userId, { resumeId, jobDescription });
        return NextResponse.json(result);
    }
    catch (error) {
        if (error instanceof ServiceError) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }
        return NextResponse.json({ message: "AI service error. Please try again." }, { status: 500 });
    }
}
