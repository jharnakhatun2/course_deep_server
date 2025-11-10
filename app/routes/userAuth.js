const express = require("express");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const connectToDatabase = require("../db");
const router = express.Router();

/******************** Register ********************/
router.post("/register", async (req, res) => {
  try {
    const { userDatabase } = await connectToDatabase();
    const { name, email, password } = req.body;
    const existingUser = await userDatabase.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await userDatabase.insertOne({
      name,
      email,
      password: hashedPassword,
      role: "user",
      createdAt: new Date(),
    });

    res.status(201).json({
      message: "Registration successful",
      userId: result.insertedId,
    });
  } catch (err) {
    res.status(500).json({ message: "Registration error", error: err.message });
  }
});

/******************** Login ********************/
router.post("/login", async (req, res) => {
  try {
    const { userDatabase } = await connectToDatabase();
    const { email, password } = req.body;
    const user = await userDatabase.findOne({ email });
    if (!user) return res.status(404).json({ message: "Email not found" });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res.status(401).json({ message: "Incorrect password" });

    const token = jwt.sign(
      { email: user.email, role: user.role },
      process.env.ACCESS_TOKEN,
      {
        expiresIn: "7d",
      }
    );

    // Create a user object without the password
    const userWithoutPassword = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    };

    res
      .cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({ message: "Login successful", token: token, user: userWithoutPassword });
  } catch (err) {
    res.status(500).json({ message: "Login error", error: err.message });
  }
});

/******************** logout ********************/
router.post("/logout", (req, res) => {
  res
    .clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    .json({ success: true, message: "Logged out successfully" });
});

module.exports = router;
