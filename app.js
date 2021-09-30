const express = require("express");
const morgan = require("morgan");

const app = express();

// GLOBAL MIDDLEWARES ____________________

// Development logging
if (process.env.NODE_ENV === "development") app.use(morgan("dev"));

// TODO: Implementing a rate limiter

module.exports = app;
