import { NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import { updateApplication, deleteApplication } from "@/lib/services/applicationService";
import { ServiceError } from "@/lib/services/errors";
import logger from "@/lib/observability/logger";
export async function PATCH(request, { params }) {
    try {
        await connectDB();
        const authResult = await protect(request);
        if (authResult instanceof NextResponse)
            return authResult;
        const { id } = await params;
        const body = await request.json().catch(() => ({}));
        const result = await updateApplication(authResult.userId, id, body);
        return NextResponse.json(result);
    }
    catch (error) {
        logger.error("updateApplication failed:", error.message);
        if (error instanceof ServiceError) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }
        return NextResponse.json({ message: "Something went wrong updating the application" }, { status: 500 });
    }
}
export async function DELETE(request, { params }) {
    try {
        await connectDB();
        const authResult = await protect(request);
        if (authResult instanceof NextResponse)
            return authResult;
        const { id } = await params;
        const result = await deleteApplication(authResult.userId, id);
        return NextResponse.json(result);
    }
    catch (error) {
        logger.error("deleteApplication failed:", error.message);
        if (error instanceof ServiceError) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }
        return NextResponse.json({ message: "Something went wrong deleting the application" }, { status: 500 });
    }
}
