const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const connectToDatabase = require("../db");

// GET all Courses
router.get("/", async (req, res) => {
  try {
    const { coursesDatabase } = await connectToDatabase();
    const result = await coursesDatabase.find().toArray();
    res.send(result);
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// GET course by ID
router.get("/:id", async (req, res) => {
  try {
    const { coursesDatabase } = await connectToDatabase();
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await coursesDatabase.findOne(query);
    result ? res.send(result) : res.status(404).send("Course not found");
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// POST new course
router.post("/", async (req, res) => {
  try {
    const { coursesDatabase } = await connectToDatabase();
    const courseInfo = req.body;
    const result = await coursesDatabase.insertOne(courseInfo);
    res.send(result);
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// UPDATE course by ID
router.patch("/:id", async (req, res) => {
  try {
    const { coursesDatabase } = await connectToDatabase();
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const options = { upsert: true };
    const updateDoc = { $set: req.body };
    const result = await coursesDatabase.updateOne(filter, updateDoc, options);
    res.send(result);
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// DELETE course by ID
router.delete("/:id", async (req, res) => {
  try {
    const { coursesDatabase } = await connectToDatabase();
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await coursesDatabase.deleteOne(query);
    res.send(result);
  } catch (err) {
    res.status(500).send("Server error");
  }
});

module.exports = router;
