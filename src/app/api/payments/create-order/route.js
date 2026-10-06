import { NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import { createOrder } from "@/lib/services/paymentService";
import { ServiceError } from "@/lib/services/errors";
import logger from "@/lib/observability/logger";
export async function POST(request) {
    try {
        await connectDB();
        const authResult = await protect(request);
        if (authResult instanceof NextResponse)
            return authResult;
        const result = await createOrder(authResult.userId);
        return NextResponse.json(result);
    }
    catch (error) {
        logger.error("Create Razorpay Order error:", error.message);
        if (error instanceof ServiceError) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }
        return NextResponse.json({ message: "Something went wrong. Please try again." }, { status: 500 });
    }
}
