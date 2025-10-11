const express = require("express");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const connectToDatabase = require("../db");
const { ObjectId } = require("mongodb");
const verifyToken = require("./verifyToken");
const router = express.Router();


/******************** Check Current User ********************/
router.get("/me", verifyToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { userDatabase } = await connectToDatabase();
    const user = await userDatabase.findOne({ email: req.user.email });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return the same user object structure as login
    const userWithoutPassword = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    };

    res.json(userWithoutPassword); // ← Remove the nested "user" property
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/******************** Get all User ********************/
router.get("/", async (req, res) => {
  try {
    const { userDatabase } = await connectToDatabase();
    const result = await userDatabase.find().toArray();
    res.send(result);
  } catch (err) {
    res.status(500).send("Server error");
  }
});

/******************** Get single User ********************/
// GET User by ID
router.get("/:id", async (req, res) => {
  try {
    const { userDatabase } = await connectToDatabase();
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await userDatabase.findOne(query);
    result ? res.send(result) : res.status(404).send("User not found");
  } catch (err) {
    res.status(500).send("Server error");
  }
});

/******************** Update ********************/
 // Update user info - only if token email matches
    router.patch("/", verifyToken, async (req, res) => {
      try {
        const { userDatabase } = await connectToDatabase();
        const user = req.body;
        const filter = { email: user.email };

        // Ensure the logged-in user can only update their own info
        if (req.user.email !== user.email) {
          return res.status(403).send({ message: "Forbidden Access" });
        }

        const updateUser = {
          $set: {
            name: user.name,
            lastSignInTime: user.lastSignInTime,
            // Don't allow email change here unless you handle it carefully
          },
        };

        const result = await userDatabase.updateOne(filter, updateUser);
        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "User not found" });
        }

        res.send({ success: true, message: "User updated successfully" });
      } catch (error) {
        console.error("Update user error:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    /******************** Delete ********************/
    // Delete user - user can delete their own account, admin can delete any
    router.delete("/:id", verifyToken, async (req, res) => {
      try {
        const { userDatabase } = await connectToDatabase();
        const id = req.params.id;
        const userToDelete = await userDatabase.findOne({
          _id: new ObjectId(id),
        });

        if (!userToDelete) {
          return res.status(404).send({ message: "User not found" });
        }

        // Check if the requester is the same user OR an admin
        if (
          req.user.email !== userToDelete.email &&
          req.user.role !== "admin"
        ) {
          return res.status(403).send({ message: "Forbidden Access" });
        }

        const result = await userDatabase.deleteOne({ _id: new ObjectId(id) });
        res.send({ success: true, message: "User deleted successfully" });
      } catch (error) {
        console.error("Delete user error:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });


module.exports = router;
