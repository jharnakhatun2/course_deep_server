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

// POST new cart item
router.post("/", async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId || !quantity) {
      return res.status(400).json({ error: "ProductId and quantity required" });
    }

    const { coursesDatabase, cartDatabase } = await connectToDatabase();

    // ✅ Fetch course from DB
    const course = await coursesDatabase.findOne({ _id: new ObjectId(productId) });
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // ✅ Check if item already exists in cart
    const existingItem = await cartDatabase.findOne({ productId });

    if (existingItem) {
      // update quantity
      await cartDatabase.updateOne(
        { productId },
        { $inc: { quantity } }
      );
    } else {
      // insert new item
      await cartDatabase.insertOne({
        productId,
        name: course.name,
        price: course.price,
        quantity,
      });
    }

    const updatedCart = await cartDatabase.find().toArray();
    res.status(201).json(updatedCart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE cart item by productId
router.delete("/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const { cartDatabase } = await connectToDatabase();

    const result = await cartDatabase.deleteOne({ productId });
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
