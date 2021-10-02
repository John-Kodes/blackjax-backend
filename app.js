const express = require("express");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");

const userRoutes = require("./routes/userRoutes");

const app = express();

// GLOBAL MIDDLEWARES ____________________

// Development logging
if (process.env.NODE_ENV === "development") app.use(morgan("dev"));

// TODO: Implementing a rate limiter

// BODY PARSER & READING DATA FROM BODY INTO REQ.BODY
app.use(express.json({ limit: "10kb" })); // req.body max size is 10kb

// Parsing the cookie
app.use(cookieParser());

// Data sanitization
app.use(mongoSanitize()); // looks at the body, query and params then filters our '$' and '.'
app.use(xss()); // converts html symbols like <> to their HTML entities.

// API ROUTES: Mounting Routes ___________
app.use("/api/v1/users", userRoutes);

module.exports = app;
