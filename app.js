const path = require("path");
const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const compression = require("compression");

const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");
const userRoutes = require("./routes/userRoutes");

const app = express();

app.enable("trust proxy");

// GLOBAL MIDDLEWARES ____________________

// Setting view engine
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// Development logging
if (process.env.NODE_ENV === "development") app.use(morgan("dev"));

// Sets important security headers
app.use(helmet());

// RATE LIMITER
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000, // Time span
  message: "Too many requests from this IP, Please try again in an hour!",
});
app.use("/api", limiter);

// BODY PARSER & READING DATA FROM BODY INTO REQ.BODY
app.use(express.json({ limit: "10kb" })); // req.body max size is 10kb

// Parsing the cookie
app.use(cookieParser());

// Data sanitization
app.use(mongoSanitize()); // looks at the body, query and params then filters our '$' and '.'
app.use(xss()); // converts html symbols like <> to their HTML entities.

// Prevent Parameter Pollution. Must be at the end of middleware
app.use(hpp());

app.use(compression());

// API ROUTES: Mounting Routes ___________
app.use("/api/v1/users", userRoutes);

// 404 route handler
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// implementing global error handler
app.use(globalErrorHandler);

module.exports = app;
