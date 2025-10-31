const { MongoClient, ServerApiVersion} = require("mongodb");
require("dotenv").config();

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xu3a3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  maxPoolSize: 10,
  connectTimeoutMS: 5000,
});

async function connectToDatabase() {
  if (!client.topology || !client.topology.isConnected()) {
    await client.connect();
    console.log("Connected to MongoDB");
  }

  const db = client.db("course-deep");
  return {
    userDatabase: db.collection("users"),
    coursesDatabase: db.collection("courses"),
    categoriesDatabase: db.collection("categories"),
    blogsDatabase: db.collection("blogs"),
    eventsDatabase: db.collection("events"),
    bookingsDatabase: db.collection("bookings"),
    enrollmentsDatabase: db.collection("enrollments"),
    cartDatabase: db.collection("cart"),
  };
}

module.exports = connectToDatabase;
