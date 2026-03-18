const express = require("express");
const {
  createBooking,
  getMyBookings,
  getBooking,
  cancelBooking,
  getAllBookings,
  getDoctorBookings,
} = require("../controllers/bookingController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// User routes
router.post("/", protect, createBooking);                    // POST /api/bookings - create booking
router.get("/user/my", protect, getMyBookings);             // GET /api/bookings/user/my - get user bookings
router.get("/:id", protect, getBooking);                     // GET /api/bookings/:id - get single booking
router.delete("/:id", protect, cancelBooking);              // DELETE /api/bookings/:id - cancel booking

// Admin routes
router.get("/admin/all", protect, authorize("admin"), getAllBookings);  // GET /api/bookings/admin/all - get all bookings

// Doctor routes
router.get("/doctor/my", protect, authorize("doctor"), getDoctorBookings);  // GET /api/bookings/doctor/my - get doctor's bookings

module.exports = router;
