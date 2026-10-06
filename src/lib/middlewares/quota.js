import User from "../models/User";
import { claimQuota, refundQuota } from "../utils/quota";
export async function checkQuota(request, userId, feature, limit) {
    let user;
    try {
        user = await User.findOne({ firebaseUid: userId }).select("subscriptionTier");
    }
    catch {
        return { error: true, status: 503, message: "Service temporarily unavailable" };
    }
    if (!user) {
        return { error: true, status: 503, message: "Service temporarily unavailable" };
    }
    if (user.subscriptionTier === "premium") {
        return { error: false };
    }
    let used;
    try {
        used = await claimQuota(userId, feature);
    }
    catch {
        return { error: true, status: 503, message: "Service temporarily unavailable" };
    }
    if (used > limit) {
        try {
            await refundQuota(userId, feature);
        }
        catch {
            // non-fatal
        }
        return { error: true, status: 429, message: "Daily limit exceeded", quotaExhausted: true };
    }
    return { error: false, userId: user._id };
}
export async function refundQuotaOnError(userId, feature) {
    try {
        await refundQuota(userId, feature);
    }
    catch {
        // non-fatal
    }
}
