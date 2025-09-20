const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const connectToDatabase = require("../db");

// GET all blogs
router.get("/", async (req, res) => {
  try {
    const { blogsDatabase } = await connectToDatabase();
    const result = await blogsDatabase.find().toArray();
    res.send(result);
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// GET blog by ID
router.get("/:id", async (req, res) => {
  try {
    const { blogsDatabase } = await connectToDatabase();
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await blogsDatabase.findOne(query);
    result ? res.send(result) : res.status(404).send("Blog not found");
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// POST new blog
router.post("/", async (req, res) => {
  try {
    const { blogsDatabase } = await connectToDatabase();
    const blogInfo = req.body;
    const result = await blogsDatabase.insertOne(blogInfo);
    res.send(result);
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// UPDATE blog by ID
router.patch("/:id", async (req, res) => {
  try {
    const { blogsDatabase } = await connectToDatabase();
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const options = { upsert: true };
    const updateDoc = { $set: req.body };
    const result = await blogsDatabase.updateOne(filter, updateDoc, options);
    res.send(result);
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// DELETE blog by ID
router.delete("/:id", async (req, res) => {
  try {
    const { blogsDatabase } = await connectToDatabase();
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await blogsDatabase.deleteOne(query);
    res.send(result);
  } catch (err) {
    res.status(500).send("Server error");
  }
});


module.exports = router;
