import express from "express";
import {
  createCheckoutSession,
  createPortalSession,
  handleStripeWebhook,
} from "../controllers/paymentController.js";
import protect from "../middlewares/authMiddleware.js";

const paymentRouter = express.Router();

// Session endpoints require auth
paymentRouter.post("/create-checkout-session", protect, createCheckoutSession);
paymentRouter.post("/create-portal-session", protect, createPortalSession);

// Webhook endpoint does NOT use protect (Stripe signature verification is done inside the handler)
paymentRouter.post("/webhook", handleStripeWebhook);

export default paymentRouter;
