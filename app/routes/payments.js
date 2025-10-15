const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const connectToDatabase = require("../db");

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Create payment intent
router.post("/create-payment-intent", async (req, res) => {
  try {
    const { cartItems, email } = req.body;
    
    if (!cartItems || !email || !Array.isArray(cartItems)) {
      return res.status(400).json({ error: "Invalid data: cartItems and email are required" });
    }

    // Calculate total amount in cents
    const amount = Math.round(
      cartItems.reduce((total, item) => total + (item.price * item.quantity), 0) * 100
    );

    // Validate amount
    if (amount < 50) { // Stripe requires minimum amount (50 cents = $0.50)
      return res.status(400).json({ error: "Amount must be at least $0.50" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "usd",
      receipt_email: email,
      metadata: { 
        integration_check: "accept_a_payment",
        cart_items: JSON.stringify(cartItems.map(item => ({
          id: item.productId,
          type: item.type,
          quantity: item.quantity
        })))
      },
    });

    res.json({ 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id 
    });
  } catch (err) {
    console.error("Payment intent error:", err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

module.exports = router;