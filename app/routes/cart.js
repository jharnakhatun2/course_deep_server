const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const connectToDatabase = require("../db");

// GET all cart items
router.get("/", async (req, res) => {
  try {
    const { cartDatabase } = await connectToDatabase();
    const cartItems = await cartDatabase.find().toArray();
    res.json(cartItems);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { productId, quantity, type } = req.body; // Added 'type' parameter

    if (!productId || !quantity || !type) {
      return res
        .status(400)
        .json({ error: "ProductId, quantity, and type are required" });
    }

    const { coursesDatabase, eventsDatabase, cartDatabase } =
      await connectToDatabase();
    let product;

    // ✅ Fetch product based on type
    if (type === "course") {
      product = await coursesDatabase.findOne({ _id: new ObjectId(productId) });
    } else if (type === "event") {
      product = await eventsDatabase.findOne({ _id: new ObjectId(productId) });
    } else {
      return res.status(400).json({ error: "Invalid product type" });
    }

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // ✅ Check if item already exists in cart (include type in search)
    const existingItem = await cartDatabase.findOne({
      productId,
      type,
    });

    if (existingItem) {
      // Update quantity for existing item
      await cartDatabase.updateOne({ productId, type }, { $inc: { quantity } });
    } else {
      // Insert new item with type
      await cartDatabase.insertOne({
        productId,
        name: product.title || product.name,
        price: product.price,
        quantity,
        type,
        image: product.image,
        // Add event-specific fields if needed
        ...(type === "event" && {
          date: product.date,
          time: product.time,
          location: product.location,
        }),
      });
    }

    const updatedCart = await cartDatabase.find().toArray();
    res.status(201).json(updatedCart);
  } catch (err) {
    console.error("Cart POST error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH cart item quantity
router.patch("/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const { type, quantity } = req.body;

    if (!type || quantity === undefined || quantity === null) {
      return res.status(400).json({ error: "Type and quantity are required" });
    }

    if (quantity < 0) {
      return res.status(400).json({ error: "Quantity cannot be negative" });
    }

    const { cartDatabase, coursesDatabase, eventsDatabase } =
      await connectToDatabase();

    // Check if item exists in cart
    const existingItem = await cartDatabase.findOne({
      productId,
      type,
    });

    if (!existingItem) {
      return res.status(404).json({ error: "Cart item not found" });
    }

    // For quantity 0, remove the item from cart
    if (quantity === 0) {
      await cartDatabase.deleteOne({ productId, type });
      const updatedCart = await cartDatabase.find().toArray();
      return res.json(updatedCart);
    }

    // Validate product availability based on type
    let product;
    if (type === "course") {
      product = await coursesDatabase.findOne({ _id: new ObjectId(productId) });
    } else if (type === "event") {
      product = await eventsDatabase.findOne({ _id: new ObjectId(productId) });

      // Check event seat availability
      if (product && quantity > product.seats) {
        return res.status(400).json({
          error: `Only ${product.seats} seats available for this event`,
        });
      }
    }

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Update the quantity
    await cartDatabase.updateOne({ productId, type }, { $set: { quantity } });

    const updatedCart = await cartDatabase.find().toArray();
    res.json(updatedCart);
  } catch (err) {
    console.error("Cart PATCH error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE cart item by productId
router.delete("/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const { type } = req.query; // Get type from query params
    const { cartDatabase } = await connectToDatabase();

    const result = await cartDatabase.deleteOne({
      productId,
      ...(type && { type }), // Include type if provided
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE all cart items
router.delete("/clear", async (req, res) => {
  try {
    const { cartDatabase } = await connectToDatabase();
    await cartDatabase.deleteMany({});
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
