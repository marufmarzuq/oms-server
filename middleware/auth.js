const jwt = require("jsonwebtoken");
const pkg = require("pg");
const { Client } = pkg;
const dotenv = require("dotenv");
dotenv.config();

const credentials = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
};
const config = process.env;

const verifyToken = (req, res, next) => {
  const token =
    req.body.token || req.query.token || req.headers["x-access-token"];

  if (!token) {
    return res.status(403).send({
      success: false,
      message: "A token is required for authentication",
      errorCode: 403,
    });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  } catch (err) {
    return res.status(401).send({
      success: false,
      message: "Invalid Token",
      errorCode: 401,
    });
  }
  return next();
};

module.exports = verifyToken;
