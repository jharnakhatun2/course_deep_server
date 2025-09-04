const express = require("express");
const router = express.Router();
const connectToDatabase = require("../db");

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
    const result = await userDatabase.insertOne(userInfo);
    res.send(result);
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// // UPDATE User by ID
// router.patch("/:id", async (req, res) => {
//   try {
//     const { userDatabase } = await connectToDatabase();
//     const id = req.params.id;
//     const filter = { _id: new ObjectId(id) };
//     const options = { upsert: true };
//     const updateDoc = { $set: req.body };
//     const result = await userDatabase.updateOne(filter, updateDoc, options);
//     res.send(result);
//   } catch (err) {
//     res.status(500).send("Server error");
//   }
// });


// UPDATE User by email
router.patch("/", async (req, res) => {
  try {
    const { userDatabase } = await connectToDatabase();
    const email = req.body.email;
    const filter = { email };
    const options = { upsert: true };
    const updateDoc = {
        $set: {
          lastSignInTime : req.body.lastSignInTime
        },
      };
    const result = await userDatabase.updateOne(filter, updateDoc, options);
    res.send(result);
  } catch (err) {
    res.status(500).send("Server error");
  }
});


// DELETE User by ID
router.delete("/:id", async (req, res) => {
  try {
    const { userDatabase } = await connectToDatabase();
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await userDatabase.deleteOne(query);
    res.send(result);
  } catch (err) {
    res.status(500).send("Server error");
  }
});

module.exports = router;
