import { NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import { checkQuota } from "@/lib/middlewares/quota";
import { runAtsScan } from "@/lib/services/atsService";
import { ServiceError } from "@/lib/services/errors";
import logger from "@/lib/observability/logger";
export async function POST(request) {
    try {
        await connectDB();
        const authResult = await protect(request);
        if (authResult instanceof NextResponse)
            return authResult;
        const quotaResult = await checkQuota(request, authResult.userId, "ats", 1);
        if (quotaResult.error) {
            logger.error({ status: quotaResult.status, message: quotaResult.message }, "ATS quota check failed");
            return NextResponse.json({ message: quotaResult.message }, { status: quotaResult.status });
        }
        const { resumeId, jobDescription } = await request.json();
        const result = await runAtsScan(authResult.userId, { resumeId, jobDescription });
        return NextResponse.json(result);
    }
    catch (error) {
        if (error instanceof ServiceError) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }
        logger.error("runAtsScan failed:", error.message);
        return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
    }
}
