const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const connectToDatabase = require("../db");

// GET all Events
router.get("/", async (req, res) => {
  try {
    const { eventsDatabase } = await connectToDatabase();
    const result = await eventsDatabase.find().toArray();
    res.send(result);
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// GET event by ID
router.get("/:id", async (req, res) => {
  try {
    const { eventsDatabase } = await connectToDatabase();
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await eventsDatabase.findOne(query);
    result ? res.send(result) : res.status(404).send("Event not found");
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// POST new event
router.post("/", async (req, res) => {
  try {
    const { eventsDatabase } = await connectToDatabase();
    const eventInfo = req.body;
    const result = await eventsDatabase.insertOne(eventInfo);
    res.send(result);
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// UPDATE event by ID
router.patch("/:id", async (req, res) => {
  try {
    const { eventsDatabase } = await connectToDatabase();
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const options = { upsert: true };
    const updateDoc = { $set: req.body };
    const result = await eventsDatabase.updateOne(filter, updateDoc, options);
    res.send(result);
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// DELETE event by ID
router.delete("/:id", async (req, res) => {
  try {
    const { eventsDatabase } = await connectToDatabase();
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await eventsDatabase.deleteOne(query);
    res.send(result);
  } catch (err) {
    res.status(500).send("Server error");
  }
});

module.exports = router;
