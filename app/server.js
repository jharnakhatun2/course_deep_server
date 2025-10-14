const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/userAuth");
const userRoutes = require("./routes/users");
const coursesRoutes = require("./routes/courses");
const categoriesRoutes = require("./routes/categories");
const eventsRoutes = require("./routes/events");
const bookingsRoutes = require("./routes/bookings");
const blogsRoutes = require("./routes/blogs");
const cartRoutes = require("./routes/cart");
const commentsRoutes = require("./routes/comments");
const paymentRoutes = require("./routes/payments");
const verifyToken = require("./routes/verifyToken");


const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
  origin: ["http://localhost:5173", "https://course-deep.vercel.app"],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/courses", coursesRoutes);
app.use("/categories", categoriesRoutes);
app.use("/events", eventsRoutes);
app.use("/bookings", bookingsRoutes);
app.use("/blogs", blogsRoutes);
app.use("/comments", commentsRoutes);
app.use("/payments", paymentRoutes);
// Apply verifyToken middleware to all cart routes
app.use("/cart", verifyToken, cartRoutes);

// Root
app.get("/", (req, res) => {
  res.send("Course Deep Server is running on Vercel 🚀");
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

//local server
app.listen(port, () =>{
    console.log(`Server running on port: ${port}`)
});

module.exports = app;

