const express = require("express");
const cors = require("cors");

const userRoutes = require("./routes/users");
const coursesRoutes = require("./routes/courses");
const categoriesRoutes = require("./routes/categories");
const eventsRoutes = require("./routes/events");
const blogsRoutes = require("./routes/blogs");

const app = express();
const port = 5000;

// middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/users", userRoutes);
app.use("/courses", coursesRoutes);
app.use("/categories", categoriesRoutes);
app.use("/events", eventsRoutes);
app.use("/blogs", blogsRoutes);

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

