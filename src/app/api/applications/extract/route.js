import { NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import { checkQuota } from "@/lib/middlewares/quota";
import { parseExtractInput, extractApplicationDetails } from "@/lib/services/applicationService";
import { ServiceError } from "@/lib/services/errors";
export async function POST(request) {
    try {
        await connectDB();
        const authResult = await protect(request);
        if (authResult instanceof NextResponse)
            return authResult;
        // Validate input before claiming quota so bad requests don't burn it.
        let text;
        try {
            text = parseExtractInput(await request.json().catch(() => ({})));
        }
        catch (error) {
            if (error instanceof ServiceError) {
                return NextResponse.json({ message: error.message }, { status: error.status });
            }
            throw error;
        }
        const quotaResult = await checkQuota(request, authResult.userId, "extract", 30);
        if (quotaResult.error) {
            return NextResponse.json({ message: quotaResult.message }, { status: quotaResult.status });
        }
        const result = await extractApplicationDetails(authResult.userId, text);
        return NextResponse.json(result);
    }
    catch (error) {
        if (error instanceof ServiceError) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }
        return NextResponse.json({ message: "Could not extract details. Please fill the form manually." }, { status: 500 });
    }
}
