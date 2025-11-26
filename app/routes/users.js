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

    const { userDatabase, enrollmentsDatabase } = await connectToDatabase();
    const user = await userDatabase.findOne({ email: req.user.email }, { projection: { password: 0 } });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Count enrolled courses for current user
    const enrolledCoursesCount = await enrollmentsDatabase.countDocuments({
      userEmail: user.email
    });

    // Return the same user object structure as login
    const userWithoutPassword = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      enrolledCourses: enrolledCoursesCount
    };

    res.json(userWithoutPassword);
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/******************** Get all User ********************/
router.get("/", verifyToken, async (req, res) => {
  try {
    // Only allow admins to get all users
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { userDatabase, enrollmentsDatabase } = await connectToDatabase();
    
    // Get all users
    const users = await userDatabase.find({}, { projection: { password: 0 } }).toArray();

    // Get enrollment counts for all users
    const usersWithEnrolledCourses = await Promise.all(
      users.map(async (user) => {
        const enrolledCoursesCount = await enrollmentsDatabase.countDocuments({
          userEmail: user.email
        });

        return {
          ...user,
          enrolledCourses: enrolledCoursesCount
        };
      })
    );

    res.json(usersWithEnrolledCourses);
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/******************** Get User by ID ********************/
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const { userDatabase, enrollmentsDatabase } = await connectToDatabase();
    const id = req.params.id;

    // Users can only access their own data unless they're admin
    if (req.user.role !== "admin" && req.user.userId !== id) {
      return res.status(403).json({ message: "Access denied" });
    }

    const query = { _id: new ObjectId(id) };
    const user = await userDatabase.findOne(query, { projection: { password: 0 } });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Count enrolled courses using user's email
    const enrolledCoursesCount = await enrollmentsDatabase.countDocuments({
      userEmail: user.email
    });

    const userWithEnrolledCourses = {
      ...user,
      enrolledCourses: enrolledCoursesCount
    };

    res.json(userWithEnrolledCourses);
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/******************** Update ********************/
router.patch("/", verifyToken, async (req, res) => {
  try {
    const { userDatabase } = await connectToDatabase();
    const user = req.body;
    const filter = { email: user.email };

    // Ensure the logged-in user can only update their own info
    if (req.user.email !== user.email) {
      return res.status(403).json({ message: "Access Denied!" });
    }

    const updateUser = {
      $set: {
        name: user.name,
        updatedAt: new Date(),
        lastSignInTime: user.lastSignInTime,
      },
    };

    const result = await userDatabase.updateOne(filter, updateUser);
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ success: true, message: "User updated successfully" });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/******************** Update User Role (Admin Only) ********************/
router.patch("/role/:id", verifyToken, async (req, res) => {
  try {
    const { userDatabase } = await connectToDatabase();
    const id = req.params.id;
    const { role } = req.body;

    // Only admin can update roles
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const filter = { _id: new ObjectId(id) };
    const updateDoc = { $set: { role, updatedAt: new Date() } };

    const result = await userDatabase.updateOne(filter, updateDoc);

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ success: true, message: "Role updated successfully" });
  } catch (err) {
    console.error("Role update error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/******************** Delete ********************/
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const { userDatabase, enrollmentsDatabase } = await connectToDatabase();
    const id = req.params.id;
    const userToDelete = await userDatabase.findOne({
      _id: new ObjectId(id),
    });

    if (!userToDelete) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the requester is the same user OR an admin
    if (
      req.user.email !== userToDelete.email &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Access denied!" });
    }

    // Delete user's enrollments first
    await enrollmentsDatabase.deleteMany({
      userEmail: userToDelete.email
    });

    // Then delete the user
    await userDatabase.deleteOne({ _id: new ObjectId(id) });
    
    res.json({ success: true, message: "User and their enrollments deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;