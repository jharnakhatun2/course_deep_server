const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const connectToDatabase = require("../db");

// GET cart items for a specific user
router.get("/", async (req, res) => {
  try {
    const { cartDatabase } = await connectToDatabase();
    const userEmail = req.query.userEmail;

    if (!userEmail) {
      return res.status(400).json({ error: "User email is required" });
    }

    const cartItems = await cartDatabase.find({ userEmail }).toArray();
    res.json(cartItems);
  } catch (err) {
    console.error("Get cart error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ADD item to cart
router.post("/", async (req, res) => {
  try {
    const { cartDatabase, bookingsDatabase } = await connectToDatabase();
    const cartItem = req.body;

    // Validate required fields
    if (!cartItem.userEmail || !cartItem.productId || !cartItem.type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // CHECK: Prevent adding already booked events to cart
    if (cartItem.type === "event") {
      const existingBooking = await bookingsDatabase.findOne({
        userEmail: cartItem.userEmail,
        productId: cartItem.productId,
        productType: "event",
      });

      if (existingBooking) {
        return res.status(400).json({
          error: "You have already booked this event. Cannot add to cart.",
        });
      }

      // CHECK: Prevent adding duplicate events to cart
      const existingCartItem = await cartDatabase.findOne({
        userEmail: cartItem.userEmail,
        productId: cartItem.productId,
        type: "event",
      });

      if (existingCartItem) {
        return res.status(400).json({
          error: "This event is already in your cart.",
        });
      }
    }

    // STORE: Complete cart item with all product data
    const result = await cartDatabase.insertOne({
      // Basic cart fields
      productId: cartItem.productId,
      type: cartItem.type,
      quantity: cartItem.quantity,
      userEmail: cartItem.userEmail,

      // Product information
      name: cartItem.name,
      price: cartItem.price,
      originalPrice: cartItem.originalPrice,
      image: cartItem.image,

      // Event-specific fields
      date: cartItem.date,
      time: cartItem.time,
      location: cartItem.location,
      speaker: cartItem.speaker,
      category: cartItem.category,

      // Metadata
      addedAt: new Date(),
    });

    res.status(201).json({ _id: result.insertedId, ...cartItem });
  } catch (err) {
    console.error("Add to cart error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// CLEAR entire cart for user
router.delete("/clear", async (req, res) => {
  try {
    const { cartDatabase } = await connectToDatabase();
    const userEmail = req.query.userEmail;

    if (!userEmail) {
      return res.status(400).json({ error: "User email is required" });
    }

    const result = await cartDatabase.deleteMany({ userEmail });
    res.json({
      success: true,
      message: `Cart cleared for ${userEmail}`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error("Clear cart error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE item from cart
router.delete("/:productId", async (req, res) => {
  try {
    const { cartDatabase } = await connectToDatabase();
    const { productId } = req.params;
    const { type, userEmail } = req.query;

    if (!userEmail || !type) {
      return res
        .status(400)
        .json({ error: "User email and type are required" });
    }

    const result = await cartDatabase.deleteOne({
      productId,
      type,
      userEmail,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Item not found in cart" });
    }

    res.json({ success: true, message: "Item removed from cart" });
  } catch (err) {
    console.error("Remove from cart error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
