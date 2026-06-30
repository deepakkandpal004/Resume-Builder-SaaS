import Stripe from "stripe";
import User from "../models/User.js";

// Initialize Stripe. If the secret key is missing, this will fail gracefully when calls are made.
const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured in .env");
  }
  return new Stripe(secretKey);
};

// POST /api/payments/create-checkout-session
// Creates a subscription checkout session for the logged-in user.
export const createCheckoutSession = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const stripeInstance = getStripe();
    let stripeCustomerId = user.stripeCustomerId;

    // Create a new Stripe Customer if one does not exist for this user
    if (!stripeCustomerId) {
      const customer = await stripeInstance.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: userId.toString() },
      });
      stripeCustomerId = customer.id;
      user.stripeCustomerId = stripeCustomerId;
      await user.save();
    }

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      return res.status(500).json({ message: "STRIPE_PRICE_ID is not configured in .env" });
    }

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

    const session = await stripeInstance.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      allow_promotion_codes: true,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${clientUrl}/app/upgrade?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/app/upgrade?status=cancel`,
      metadata: {
        userId: userId.toString(),
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Create Stripe checkout session error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/payments/create-portal-session
// Generates a customer billing portal session to manage subscriptions.
export const createPortalSession = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.stripeCustomerId) {
      return res.status(400).json({ message: "No active Stripe customer found. Please upgrade first." });
    }

    const stripeInstance = getStripe();
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

    const session = await stripeInstance.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${clientUrl}/app/upgrade`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Create Stripe billing portal session error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/payments/webhook
// Secure endpoint to handle callbacks directly from Stripe servers.
export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return res.status(400).send("Webhook configuration error: Missing signature or webhook secret");
  }

  let event;
  try {
    const stripeInstance = getStripe();
    event = stripeInstance.webhooks.constructEvent(
      req.rawBody,
      sig,
      webhookSecret
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Signature Verification Error: ${err.message}`);
  }

  try {
    const stripeInstance = getStripe();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const subscriptionId = session.subscription;

        if (userId) {
          await User.findByIdAndUpdate(userId, {
            subscriptionTier: "premium",
            stripeSubscriptionId: subscriptionId,
          });
          console.log(`User ${userId} successfully upgraded to premium via Checkout.`);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        const customerId = invoice.customer;

        // If checkout.session.completed was somehow missed or to renew monthly
        if (subscriptionId) {
          await User.findOneAndUpdate(
            { stripeCustomerId: customerId },
            {
              subscriptionTier: "premium",
              stripeSubscriptionId: subscriptionId,
            }
          );
          console.log(`Monthly premium invoice payment succeeded for customer ${customerId}.`);
        }
        break;
      }

      case "customer.subscription.deleted":
      case "invoice.payment_failed": {
        const subscription = event.data.object;
        const subscriptionId = subscription.id || subscription.subscription;
        const customerId = subscription.customer;

        // Reset subscription tier to free
        if (subscriptionId) {
          await User.findOneAndUpdate(
            {
              $or: [
                { stripeSubscriptionId: subscriptionId },
                { stripeCustomerId: customerId }
              ]
            },
            {
              subscriptionTier: "free",
              stripeSubscriptionId: null,
            }
          );
          console.log(`Premium subscription terminated/failed for customer ${customerId}. Reverted to free tier.`);
        }
        break;
      }

      default:
        // Other events can be safely ignored
        break;
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Stripe Webhook Event Processing Error:", error);
    return res.status(500).send(`Stripe Webhook Server Error: ${error.message}`);
  }
};
