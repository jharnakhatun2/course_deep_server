const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const connectToDatabase = require("../db");
const crypto = require("crypto"); // for Gravatar email hash

// Utility function to generate Gravatar URL from email
const generateAvatarUrl = (email) => {
  const hash = crypto
    .createHash("md5")
    .update(email.trim().toLowerCase())
    .digest("hex");
  return `https://www.gravatar.com/avatar/${hash}?d=identicon`;
};

// GET all reviews for a specific course
router.get("/course/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { coursesDatabase } = await connectToDatabase();

    const course = await coursesDatabase.findOne({ _id: new ObjectId(id) });
    if (!course) return res.status(404).send("course not found");

    // Return reviews array or empty array || reviews now include nested replies
    res.send(course.reviews || []);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// POST a new review for a specific course
router.post("/course/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, review, ratings } = req.body;

    // Validate required fields
    if (!name || !email || !review || !ratings) {
      return res.status(400).send("Name, email, review and ratings are required!");
    }

    const { coursesDatabase } = await connectToDatabase();

    const newReview = {
      _id: new ObjectId(),
      name,
      email,
      review,
      ratings,
      date: new Date().toISOString(),
      image: generateAvatarUrl(email),
    };

    const result = await coursesDatabase.updateOne(
      { _id: new ObjectId(id) },
      { $push: { reviews: newReview } }
    );

    if (result.modifiedCount === 1) {
      res.status(201).send(newReview);
    } else {
      res.status(404).send("Course not found!");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error!");
  }
});

// DELETE a review by reviewId for a specific course
router.delete("/course/:courseId/:reviewId", async (req, res) => {
  try {
    const { courseId, reviewId } = req.params;
    const { coursesDatabase } = await connectToDatabase();

    const result = await coursesDatabase.updateOne(
      { _id: new ObjectId(courseId) },
      { $pull: { reviews: { _id: new ObjectId(reviewId) } } }
    );

    if (result.modifiedCount === 1) {
      res.send({ message: "Review deleted successfully" });
    } else {
      res.status(404).send("Course or Review not found!");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error!");
  }
});
module.exports = router;
