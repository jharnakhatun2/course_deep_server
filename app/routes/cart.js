// const express = require("express");
// const router = express.Router();
// const { ObjectId } = require("mongodb");
// const connectToDatabase = require("../db");
// const verifyToken = require("./verifyToken");

// router.use(verifyToken);

// // GET all cart items
// router.get("/", async (req, res) => {
//   try {
//     const { cartDatabase } = await connectToDatabase();
//     const userEmail = req.user.userEmail;
//     const cartItems = await cartDatabase
//       .find({ userEmail: userEmail })
//       .toArray();
//     res.json(cartItems);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Server error" });
//   }
// });

// // Post cart items
// router.post("/", async (req, res) => {
//   try {
//     const { productId, quantity, type } = req.body;
//     const userEmail = req.user.email;

//     if (!productId || !quantity || !type) {
//       return res
//         .status(400)
//         .json({ error: "ProductId, quantity, and type are required" });
//     }

//     const { coursesDatabase, eventsDatabase, cartDatabase } =
//       await connectToDatabase();
//     let product;

//     // Fetch product based on type
//     if (type === "course") {
//       product = await coursesDatabase.findOne({ _id: new ObjectId(productId) });
//     } else if (type === "event") {
//       product = await eventsDatabase.findOne({ _id: new ObjectId(productId) });
//     } else {
//       return res.status(400).json({ error: "Invalid product type" });
//     }

//     if (!product) {
//       return res.status(404).json({ error: "Product not found" });
//     }

//     // Check if item already exists in cart (include type in search)
//     const existingItem = await cartDatabase.findOne({
//       productId,
//       type,
//       userEmail,
//     });

//     if (existingItem) {
//       // Update quantity for existing item
//       await cartDatabase.updateOne(
//         { productId, type, userEmail },
//         { $inc: { quantity } }
//       );
//     } else {
//       // Insert new item with type
//       await cartDatabase.insertOne({
//         productId,
//         name: product.title || product.name,
//         price: product.price,
//         quantity,
//         type,
//         image: product.image,
//         userEmail: userEmail,
//         // Add event-specific fields if needed
//         ...(type === "event" && {
//           date: product.date,
//           time: product.time,
//           location: product.location,
//         }),
//       });
//     }

//     const updatedCart = await cartDatabase.find({ userEmail }).toArray();
//     res.status(201).json(updatedCart);
//   } catch (err) {
//     console.error("Cart POST error:", err);
//     res.status(500).json({ error: "Server error" });
//   }
// });

// // PATCH cart item quantity
// router.patch("/:productId", async (req, res) => {
//   try {
//     const { productId } = req.params;
//     const { type, quantity } = req.body;
//     const userEmail = req.user.email;

//     if (!type || quantity === undefined || quantity === null) {
//       return res.status(400).json({ error: "Type and quantity are required" });
//     }

//     if (quantity < 0) {
//       return res.status(400).json({ error: "Quantity cannot be negative" });
//     }

//     const { cartDatabase, coursesDatabase, eventsDatabase } =
//       await connectToDatabase();

//     // Check if item exists in cart
//     const existingItem = await cartDatabase.findOne({
//       productId,
//       type,
//       userEmail,
//     });

//     if (!existingItem) {
//       return res.status(404).json({ error: "Cart item not found" });
//     }

//     // For quantity 0, remove the item from cart
//     if (quantity === 0) {
//       await cartDatabase.deleteOne({ productId, type, userEmail });
//       const updatedCart = await cartDatabase.find({ userEmail }).toArray();
//       return res.json(updatedCart);
//     }

//     // Validate product availability based on type
//     let product;
//     if (type === "course") {
//       product = await coursesDatabase.findOne({ _id: new ObjectId(productId) });
//     } else if (type === "event") {
//       product = await eventsDatabase.findOne({ _id: new ObjectId(productId) });

//       // Check event seat availability
//       if (product && quantity > product.seats) {
//         return res.status(400).json({
//           error: `Only ${product.seats} seats available for this event`,
//         });
//       }
//     }

//     if (!product) {
//       return res.status(404).json({ error: "Product not found" });
//     }

//     // Update the quantity
//     await cartDatabase.updateOne(
//       { productId, type, userEmail },
//       { $set: { quantity } }
//     );

//     const updatedCart = await cartDatabase.find({ userEmail }).toArray();
//     res.json(updatedCart);
//   } catch (err) {
//     console.error("Cart PATCH error:", err);
//     res.status(500).json({ error: "Server error" });
//   }
// });

// // DELETE cart item by productId
// router.delete("/:productId", async (req, res) => {
//   try {
//     const { productId } = req.params;
//     const { type } = req.query;
//     const userEmail = req.user.email;

//     const { cartDatabase } = await connectToDatabase();

//     const result = await cartDatabase.deleteOne({
//       productId,
//       ...(type && { type }), // Include type if provided
//       userEmail,
//     });

//     if (result.deletedCount === 0) {
//       return res.status(404).json({ error: "Item not found" });
//     }

//     const updatedCart = await cartDatabase.find({ userEmail }).toArray();
//     res.json(updatedCart);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Server error" });
//   }
// });

// // DELETE all cart items
// router.delete("/clear", async (req, res) => {
//   try {
//     const userEmail = req.user.email;
//     const { cartDatabase } = await connectToDatabase();
//     await cartDatabase.deleteMany({ userEmail });
//     res.json({ success: true });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Server error" });
//   }
// });

// module.exports = router;

const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const connectToDatabase = require("../db");

// GET cart items for a specific user
router.get("/", async (req, res) => {
  try {
    const { cartDatabase } = await connectToDatabase();
    const userEmail = req.query.userEmail;
    
    if (!userEmail) {
      return res.status(400).json({ error: "User email is required" });
    }

    const cartItems = await cartDatabase.find({ userEmail }).toArray();
    res.json(cartItems);
  } catch (err) {
    console.error("Get cart error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// ADD item to cart
router.post("/", async (req, res) => {
  try {
    const { cartDatabase, bookingsDatabase } = await connectToDatabase();
    const cartItem = req.body;

    // Validate required fields
    if (!cartItem.userEmail || !cartItem.productId || !cartItem.type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // ✅ CHECK: Prevent adding already booked events to cart
    if (cartItem.type === "event") {
      const existingBooking = await bookingsDatabase.findOne({
        userEmail: cartItem.userEmail,
        productId: cartItem.productId,
        productType: "event"
      });

      if (existingBooking) {
        return res.status(400).json({ 
          error: "You have already booked this event. Cannot add to cart." 
        });
      }

      // 🔥 CHECK: Prevent adding duplicate events to cart
      const existingCartItem = await cartDatabase.findOne({
        userEmail: cartItem.userEmail,
        productId: cartItem.productId,
        type: "event"
      });

      if (existingCartItem) {
        return res.status(400).json({ 
          error: "This event is already in your cart." 
        });
      }
    }

    // 🔥 STORE: Complete cart item with all product data
    const result = await cartDatabase.insertOne({
      // Basic cart fields
      productId: cartItem.productId,
      type: cartItem.type,
      quantity: cartItem.quantity,
      userEmail: cartItem.userEmail,
      
      // Product information
      name: cartItem.name,
      price: cartItem.price,
      originalPrice: cartItem.originalPrice,
      image: cartItem.image,
      
      // Event-specific fields
      date: cartItem.date,
      time: cartItem.time,
      location: cartItem.location,
      speaker: cartItem.speaker,
      category: cartItem.category,
      
      // Metadata
      addedAt: new Date()
    });
    
    res.status(201).json({ _id: result.insertedId, ...cartItem });
    
  } catch (err) {
    console.error("Add to cart error:", err);
    res.status(500).json({ error: "Server error" });
  }
});



// DELETE item from cart
router.delete("/:productId", async (req, res) => {
  try {
    const { cartDatabase } = await connectToDatabase();
    const { productId } = req.params;
    const { type, userEmail } = req.query;

    if (!userEmail || !type) {
      return res.status(400).json({ error: "User email and type are required" });
    }

    const result = await cartDatabase.deleteOne({
      productId,
      type,
      userEmail
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Item not found in cart" });
    }

    res.json({ success: true, message: "Item removed from cart" });
  } catch (err) {
    console.error("Remove from cart error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// CLEAR entire cart for user
router.delete("/clear", async (req, res) => {
  try {
    const { cartDatabase } = await connectToDatabase();
    const userEmail = req.query.userEmail;

    if (!userEmail) {
      return res.status(400).json({ error: "User email is required" });
    }

    const result = await cartDatabase.deleteMany({ userEmail });
    res.json({ 
      success: true, 
      message: `Cart cleared for ${userEmail}`,
      deletedCount: result.deletedCount 
    });
  } catch (err) {
    console.error("Clear cart error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
