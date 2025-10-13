// server/routes/payments.js
const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const connectToDatabase = require("../db");

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Create payment intent
router.post("/create-payment-intent", async (req, res) => {
  try {
    const { cartItems, email } = req.body;
    if (!cartItems || !email) return res.status(400).send("Invalid data");

    const amount = cartItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // in cents
      currency: "usd",
      receipt_email: email,
      metadata: { integration_check: "accept_a_payment" },
    });

    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

module.exports = router;
