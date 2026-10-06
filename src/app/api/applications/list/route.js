import { NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import { listApplications } from "@/lib/services/applicationService";
import { ServiceError } from "@/lib/services/errors";
import logger from "@/lib/observability/logger";
export async function GET(request) {
    try {
        await connectDB();
        const authResult = await protect(request);
        if (authResult instanceof NextResponse)
            return authResult;
        const { searchParams } = new URL(request.url);
        const result = await listApplications(authResult.userId, searchParams.get("status"));
        return NextResponse.json(result);
    }
    catch (error) {
        logger.error("listApplications failed:", error.message);
        if (error instanceof ServiceError) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }
        return NextResponse.json({ message: "Something went wrong loading applications" }, { status: 500 });
    }
}
