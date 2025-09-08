const express = require("express");
const router = express.Router();
require("dotenv").config();
const jwt = require("jsonwebtoken");
const connectToDatabase = require("../db");
const { ObjectId } = require("mongodb");

//verify token
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res
      .status(401)
      .send({ message: "Unauthorized access - No token provided" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ message: "Unauthorized access - Invalid token" });
    }
    req.user = decoded;
    next();
  });
};

//jwt token creation endpoint
router.post("/jwt", async (req, res) => {
  const user = req.body;
  const token = jwt.sign(
    { email: user.email, role: user.role || "user" },
    process.env.ACCESS_TOKEN,
    { expiresIn: "1d" }
  );
  res
    .cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    })
    .send({ successful: true });
});

// GET all Users
router.get("/", async (req, res) => {
  try {
    const { userDatabase } = await connectToDatabase();
    const result = await userDatabase.find().toArray();
    res.send(result);
  } catch (err) {
    res.status(500).send("Server error");
  }
});

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

// POST new User
router.post("/", async (req, res) => {
  try {
    const { userDatabase } = await connectToDatabase();
    const userInfo = req.body;
    const existing = await userDatabase.findOne({ email: userInfo.email });
    if (existing) {
      return res.status(409).send({ message: "Email already registered" });
    }
    const result = await userDatabase.insertOne(userInfo);
    res.send(result);
  } catch (err) {
    res.status(500).send("Server error");
  }
});

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

    // Logout endpoint (clear token cookie)
    router.post("/logout", (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: true,
          sameSite: "strict",
        })
        .json({ success: true, message: "Logged out successfully" });
    });


module.exports = router;
