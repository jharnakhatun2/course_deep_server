const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const connectToDatabase = require("../db");

// GET all bookings
router.get("/", async (req, res) => {
  try {
    const { bookingsDatabase } = await connectToDatabase();
    const result = await bookingsDatabase.find().toArray();
    res.json(result);
  } catch (err) {
    console.error("Get bookings error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

//  GET bookings by user email
router.get("/user/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const { bookingsDatabase } = await connectToDatabase();

    const bookings = await bookingsDatabase
      .find({ userEmail: email })
      .toArray();
    res.json(bookings);
  } catch (err) {
    console.error("Get user bookings error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

//  POST a new booking (for payment flow)
router.post("/", async (req, res) => {
  try {
    const { bookingsDatabase, eventsDatabase, coursesDatabase } =
      await connectToDatabase();
    const bookingData = req.body;

    // CHANGE: New validation for payment flow
    if (
      !bookingData.userEmail ||
      !bookingData.productId ||
      !bookingData.productType
    ) {
      return res.status(400).json({ error: "Missing required booking fields" });
    }

    //  CHANGE: Check by productId instead of eventTitle
    const existingBooking = await bookingsDatabase.findOne({
      userEmail: bookingData.userEmail,
      productId: bookingData.productId,
      productType: bookingData.productType,
    });

    if (existingBooking) {
      return res
        .status(400)
        .json({ error: "You have already booked this event/course." });
    }

    let product;

    //  ADD: Handle both events and courses
    if (bookingData.productType === "event") {
      product = await eventsDatabase.findOne({
        _id: new ObjectId(bookingData.productId),
      });

      if (!product) {
        return res.status(404).json({ error: "Event not found" });
      }

      if (bookingData.quantity > product.seats) {
        return res.status(400).json({ error: "Not enough seats available!" });
      }

      // Reduce available seats
      const remainingSeats = product.seats - bookingData.quantity;
      await eventsDatabase.updateOne(
        { _id: new ObjectId(bookingData.productId) },
        { $set: { seats: remainingSeats } }
      );
    } else if (bookingData.productType === "course") {
      product = await coursesDatabase.findOne({
        _id: new ObjectId(bookingData.productId),
      });

      if (!product) {
        return res.status(404).json({ error: "Course not found" });
      }
    }

    //  CHANGE: Insert new booking structure
    const result = await bookingsDatabase.insertOne({
      // User information
      userId: bookingData.userId,
      userEmail: bookingData.userEmail,
      userName: bookingData.userName,

      // Product information
      productId: bookingData.productId,
      productType: bookingData.productType,
      productTitle: bookingData.productTitle,
      productPrice: bookingData.productPrice,
      quantity: bookingData.quantity,

      // Payment information
      paymentIntentId: bookingData.paymentIntentId,
      paymentStatus: bookingData.paymentStatus,
      paymentAmount: bookingData.paymentAmount,
      paymentCurrency: bookingData.paymentCurrency,

      // Event-specific data
      ...(bookingData.productType === "event" && {
        eventDate: bookingData.eventDate,
        eventTime: bookingData.eventTime,
        eventLocation: bookingData.eventLocation,
      }),

      // Booking metadata
      status: "confirmed",
      bookedAt: new Date(),
    });

    res.status(201).json({
      _id: result.insertedId,
      ...bookingData,
      bookedAt: new Date(),
    });
  } catch (err) {
    console.error("Booking creation error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ADD: Check duplicate endpoint
router.get("/check-duplicate", async (req, res) => {
  try {
    const { userEmail, productId, type } = req.query;

    if (!userEmail || !productId || !type) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const { bookingsDatabase } = await connectToDatabase();

    const existingBooking = await bookingsDatabase.findOne({
      userEmail: userEmail,
      productId: productId,
      productType: type,
    });

    res.json({
      isDuplicate: !!existingBooking,
      existingBooking: existingBooking,
    });
  } catch (err) {
    console.error("Duplicate check error:", err);
    res.status(500).json({ error: "Failed to check for duplicate booking" });
  }
});

module.exports = router;
