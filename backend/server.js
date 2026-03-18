require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const connectDB = require("./db");
const errorHandler = require("./errorHandler");
const { startExpiryJob } = require("./expirayJob");

// Import routes
const authRoutes = require("./routes/authRoute");
const doctorRoutes = require("./routes/doctorRoute");
const slotRoutes = require("./routes/slotRoute");
const bookingRoutes = require("./routes/bookingRoute");

const app = express();

// Connect to MongoDB
(async () => {
  await connectDB();
})();

// Security middleware
app.use(helmet());

// CORS - allow the frontend origin(s)
const allowedOrigins = [
  process.env.CLIENT_URL,
  "https://modex-2ev2.vercel.app",
  "https://modex-qsow.onrender.com",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, mobile apps)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 
  max: 100, // 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

// Body parser middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({ success: true, message: "Server is running" });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/slots", slotRoutes);
app.use("/api/bookings", bookingRoutes);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Central error handler (must be last)
app.use(errorHandler);

// Start expiry cron job
startExpiryJob();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

module.exports = app;
