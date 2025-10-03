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

// GET all comments for a specific blog
router.get("/blog/:blogId", async (req, res) => {
  try {
    const { blogId } = req.params;
    const { blogsDatabase } = await connectToDatabase();

    const blog = await blogsDatabase.findOne({ _id: new ObjectId(blogId) });
    if (!blog) return res.status(404).send("Blog not found");

    // Return comments array or empty array || comments now include nested replies
    res.send(blog.comments || []);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// POST a new comment for a specific blog
router.post("/blog/:blogId", async (req, res) => {
  try {
    const { blogId } = req.params;
    const { name, email, website, comment } = req.body;

    // Validate required fields
    if (!name || !email || !comment) {
      return res.status(400).send("Name, email, and comment are required");
    }

    const { blogsDatabase } = await connectToDatabase();

    const newComment = {
      _id: new ObjectId(),
      name,
      email,
      website: website || "",
      comment,
      date: new Date().toISOString(),
      image: generateAvatarUrl(email),
    };

    const result = await blogsDatabase.updateOne(
      { _id: new ObjectId(blogId) },
      { $push: { comments: newComment } }
    );

    if (result.modifiedCount === 1) {
      res.status(201).send(newComment);
    } else {
      res.status(404).send("Blog not found");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// POST reply to a comment
router.post("/blog/:blogId/:commentId/replies", async (req, res) => {
  try {
    const { blogId, commentId } = req.params;
    const { name, email, comment } = req.body;

    if (!name || !email || !comment) {
      return res.status(400).send("Name, email, and reply text are required");
    }

    const { blogsDatabase } = await connectToDatabase();

    const newReply = {
      _id: new ObjectId(),
      name,
      email,
      comment,
      date: new Date().toISOString(),
      image: generateAvatarUrl(email),
    };

    const result = await blogsDatabase.updateOne(
      { _id: new ObjectId(blogId), "comments._id": new ObjectId(commentId) },
      { $push: { "comments.$.replies": newReply } }
    );

    if (result.modifiedCount === 1) {
      res.status(201).send(newReply);
    } else {
      res.status(404).send("Blog or comment not found");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});


// DELETE a comment by commentId for a specific blog
router.delete("/blog/:blogId/:commentId", async (req, res) => {
  try {
    const { blogId, commentId } = req.params;
    const { blogsDatabase } = await connectToDatabase();

    const result = await blogsDatabase.updateOne(
      { _id: new ObjectId(blogId) },
      { $pull: { comments: { _id: new ObjectId(commentId) } } }
    );

    if (result.modifiedCount === 1) {
      res.send({ message: "Comment deleted successfully" });
    } else {
      res.status(404).send("Blog or comment not found");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

module.exports = router;
