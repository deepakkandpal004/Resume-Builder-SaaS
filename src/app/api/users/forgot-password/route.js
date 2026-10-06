import { NextResponse } from "next/server";
import { sendPasswordReset } from "@/lib/services/userService";
import { ServiceError } from "@/lib/services/errors";
export async function POST(request) {
    try {
        const { email } = await request.json();
        const result = await sendPasswordReset(email);
        return NextResponse.json(result);
    }
    catch (error) {
        if (error instanceof ServiceError) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }
        return NextResponse.json({ message: "Something went wrong. Please try again." }, { status: 500 });
    }
}
