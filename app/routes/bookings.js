const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const connectToDatabase = require("../db");

// GET all bookings
router.get("/", async (req, res) => {
  try {
    const { bookingsDatabase } = await connectToDatabase();
    const result = await bookingsDatabase.find().toArray();
    res.send(result);
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// POST a new booking
router.post("/", async (req, res) => {
  try {
    const { bookingsDatabase, eventsDatabase } = await connectToDatabase();
    const { name, email, phone, eventTitle, tickets, date } = req.body;

    if (!email || !eventTitle) {
      return res.status(400).send("Email and Event Title are required");
    }

    // Check if the user has already booked this event
    const existingBooking = await bookingsDatabase.findOne({ email, eventTitle });
    if (existingBooking) {
      return res.status(400).send("You have already booked this event.");
    }

    // Find the event
    const event = await eventsDatabase.findOne({ title: eventTitle });
    if (!event) {
      return res.status(404).send("Event not found");
    }

    if (tickets > event.seats) {
      return res.status(400).send("Not enough seats available!");
    }

    // Reduce available seats
    const remainingSeats = event.seats - tickets;
    await eventsDatabase.updateOne(
      { _id: new ObjectId(event._id) },
      { $set: { seats: remainingSeats } }
    );

    // Insert the booking record
    const result = await bookingsDatabase.insertOne({
      name,
      email,
      phone,
      eventTitle,
      tickets,
      date,
      bookedAt: new Date(),
    });

    res.send(result);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

module.exports = router;
