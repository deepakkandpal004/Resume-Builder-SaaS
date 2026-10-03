/**
 * Layered architecture — Razorpay payment business logic.
 */
import crypto from "crypto";
import Razorpay from "razorpay";
import User from "@/lib/models/User";
import { getMongoUserId } from "@/lib/utils/userHelper";
import logger from "@/lib/observability/logger";
import { ServiceError } from "./errors";

const PLAN_AMOUNT = 29900; // ₹299 in paise
const PLAN_CURRENCY = "INR";

const getRazorpayInstance = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are missing in .env");
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

export async function createOrder(firebaseUserId: string) {
  const userId = await getMongoUserId(firebaseUserId);
  const user: any = await User.findById(userId);
  if (!user) throw new ServiceError("User not found", 404);

  const rzp = getRazorpayInstance();
  const receipt = `receipt_order_${Date.now()}`;

  const order: any = await rzp.orders.create({
    amount: PLAN_AMOUNT,
    currency: PLAN_CURRENCY,
    receipt,
    payment_capture: true as any,
  });

  if (!order) {
    throw new Error("Razorpay order creation failed");
  }

  user.razorpayOrderId = order.id;
  await user.save();

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
    user: {
      name: user.name,
      email: user.email,
    },
  };
}

export async function verifyPayment(
  firebaseUserId: string,
  input: {
    razorpay_order_id?: unknown;
    razorpay_payment_id?: unknown;
    razorpay_signature?: unknown;
  }
) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = input;
  const userId = await getMongoUserId(firebaseUserId);

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new ServiceError("Missing required payment details", 400);
  }

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    throw new ServiceError("Razorpay secret key is not configured", 500);
  }

  const signBody = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(signBody)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    logger.warn(`Invalid Razorpay signature for user ${userId}, Order: ${razorpay_order_id}`);
    return {
      success: false,
      message: "Invalid signature verification. Payment authentication failed.",
      status: 400,
    };
  }

  const user: any = await User.findByIdAndUpdate(
    userId,
    {
      subscriptionTier: "premium",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
    },
    { new: true }
  );

  if (!user) throw new ServiceError("User not found", 404);

  logger.info(`User ${userId} successfully upgraded to premium via Razorpay. Order: ${razorpay_order_id}`);
  return {
    success: true,
    message: "Payment verified successfully. Your account has been upgraded to Premium!",
    user: {
      name: user.name,
      email: user.email,
      subscriptionTier: user.subscriptionTier,
    },
    status: 200,
  };
}
