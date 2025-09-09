const jwt = require("jsonwebtoken");
require("dotenv").config();


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

module.exports = verifyToken;