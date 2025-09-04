const express = require("express");
const router = express.Router();
const connectToDatabase = require("../db");

// GET all Categories
router.get("/", async (req, res) => {
  try {
    const { categoriesDatabase } = await connectToDatabase();
    const result = await categoriesDatabase.find().toArray();
    res.send(result);
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// GET categories by ID
router.get("/:id", async (req, res) => {
  try {
    const { categoriesDatabase } = await connectToDatabase();
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await categoriesDatabase.findOne(query);
    result ? res.send(result) : res.status(404).send("Categories not found");
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// POST new categories
router.post("/", async (req, res) => {
  try {
    const { categoriesDatabase } = await connectToDatabase();
    const certInfo = req.body;
    const result = await categoriesDatabase.insertOne(certInfo);
    res.send(result);
  } catch (err) {
    res.status(500).send("Server error");
  }
});


// UPDATE categories by ID
router.patch("/:id", async (req, res) => {
  try {
    const { categoriesDatabase } = await connectToDatabase();
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const options = { upsert: true };
    const updateDoc = { $set: req.body };
    const result = await categoriesDatabase.updateOne(filter, updateDoc, options);
    res.send(result);
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// DELETE categories by ID
router.delete("/:id", async (req, res) => {
  try {
    const { categoriesDatabase } = await connectToDatabase();
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await categoriesDatabase.deleteOne(query);
    res.send(result);
  } catch (err) {
    res.status(500).send("Server error");
  }
});


module.exports = router;
