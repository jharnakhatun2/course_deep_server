const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const connectToDatabase = require("../db");

// GET all Instructor Courses
router.get("/", async (req, res) => {
  try {
    const { instructorCoursesDatabase } = await connectToDatabase();
    const result = await instructorCoursesDatabase.find().sort({ _id: -1 }).toArray();
    res.send(result);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// GET Instructor course by ID
router.get("/:id", async (req, res) => {
  try {
    const { instructorCoursesDatabase } = await connectToDatabase();
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await instructorCoursesDatabase.findOne(query);
    result ? res.send(result) : res.status(404).send("Course not found");
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// POST new Instructor course
router.post("/", async (req, res) => {
  try {
    const { instructorCoursesDatabase } = await connectToDatabase();
    const courseInfo = req.body;
    const result = await instructorCoursesDatabase.insertOne(courseInfo);
    res.send(result);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// UPDATE Instructor course by ID
router.put("/:id", async (req, res) => {
  try {
    const { instructorCoursesDatabase } = await connectToDatabase();
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const options = { upsert: true };
    const updateDoc = { $set: req.body };
    const result = await instructorCoursesDatabase.updateOne(filter, updateDoc, options);
    res.send(result);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE Instructor course by ID
router.delete("/:id", async (req, res) => {
  try {
    const { instructorCoursesDatabase } = await connectToDatabase();
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await instructorCoursesDatabase.deleteOne(query);
    res.send(result);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
