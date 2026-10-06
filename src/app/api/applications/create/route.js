import { NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import { createApplication } from "@/lib/services/applicationService";
import { ServiceError } from "@/lib/services/errors";
import logger from "@/lib/observability/logger";
export async function POST(request) {
    try {
        await connectDB();
        const authResult = await protect(request);
        if (authResult instanceof NextResponse)
            return authResult;
        const body = await request.json().catch(() => ({}));
        const result = await createApplication(authResult.userId, body);
        return NextResponse.json(result, { status: 201 });
    }
    catch (error) {
        logger.error("createApplication failed:", error.message);
        if (error instanceof ServiceError) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }
        return NextResponse.json({ message: "Something went wrong tracking the application" }, { status: 500 });
    }
}
