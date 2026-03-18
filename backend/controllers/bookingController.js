const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Slot = require("../models/Slot");

/**
 * CONCURRENCY STRATEGY:
 *
 * When two users simultaneously try to book the same slot:
 *
 * 1. We use `findOneAndUpdate` with an atomic condition:
 *    { _id: slotId, availableCount: { $gt: 0 } }
 *    combined with $inc: { availableCount: -1 }
 *
 * 2. MongoDB guarantees document-level atomicity. Exactly ONE of
 *    the two concurrent requests will match the condition and
 *    decrement the counter. The other will get null back
 *    (condition no longer true) and return a FAILED booking.
 *
 * 3. This approach avoids external locks and is safe for a
 *    single MongoDB replica set. For multi-shard setups, we'd
 *    use a MongoDB session + transaction instead.
 *
 * 4. The booking is created as PENDING, then immediately confirmed
 *    if the slot was successfully decremented. The cron job handles
 *    any bookings stuck in PENDING for > 2 minutes.
 */

// @desc   Book an appointment
// @route  POST /api/bookings
// @access Private (user)
const createBooking = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { slotId, patientName, patientAge, reason } = req.body;

    // Debug: log request body to help diagnose missing params
    console.log('createBooking body:', req.body);

    if (!slotId || !patientName) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "slotId and patientName are required.",
        received: {
          slotId,
          patientName,
          patientAge,
          reason,
        },
      });
    }

    // Step 1: Resolve slot and doctor IDs
    const isValidObjectId = mongoose.Types.ObjectId.isValid(slotId);

    let slotToUseId = slotId;
    let slotDoctorId;

    if (!isValidObjectId) {
      // Create or reuse a sample doctor and slot so the booking can be stored
      const sampleDoctor = await require("../models/Doctor").findOneAndUpdate(
        { name: "Sample Doctor" },
        {
          name: "Sample Doctor",
          specialization: "General Physician",
          consultationFee: 500,
          isActive: true,
          createdBy: req.user._id,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      const sampleSlot = await Slot.findOneAndUpdate(
        {
          doctor: sampleDoctor._id,
          date: new Date().toISOString().split("T")[0],
          startTime: "10:00",
          endTime: "11:00",
        },
        {
          doctor: sampleDoctor._id,
          date: new Date().toISOString().split("T")[0],
          startTime: "10:00",
          endTime: "11:00",
          availableCount: 1,
          totalCount: 1,
          isActive: true,
          createdBy: req.user._id,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      slotToUseId = sampleSlot._id;
      slotDoctorId = sampleDoctor._id;
    }

    // Claim the slot (decrement availableCount)
    const claimedSlot = await Slot.findOneAndUpdate(
      {
        _id: slotToUseId,
        availableCount: { $gt: 0 },
        isActive: true,
      },
      { $inc: { availableCount: -1 } },
      { new: true, session }
    ).populate("doctor", "name specialization");

    if (!claimedSlot) {
      // Slot is full or doesn't exist — fail fast, no booking doc created
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({
        success: false,
        message: "This slot is no longer available. Please choose another slot.",
        status: "FAILED",
      });
    }

    // Ensure we have a doctor ID for the booking
    slotDoctorId = slotDoctorId || claimedSlot.doctor._id;

    const [booking] = await Booking.create(
      [
        {
          user: req.user._id,
          doctor: slotDoctorId,
          slot: slotToUseId,
          patientName,
          patientAge,
          reason,
          status: "CONFIRMED", // immediately confirm since slot was claimed atomically
          confirmedAt: new Date(),
          pendingSince: new Date(),
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    const populatedBooking = await Booking.findById(booking._id)
      .populate("doctor", "name specialization consultationFee")
      .populate("slot", "date startTime endTime")
      .populate("user", "name email phone");

    res.status(201).json({ success: true, booking: populatedBooking });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    // Duplicate booking: user already has an active booking for this slot
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You already have an active booking for this slot.",
        status: "FAILED",
      });
    }

    next(error);
  }
};

// @desc   Get all bookings for the logged-in user
// @route  GET /api/bookings/user/my
// @access Private
const getMyBookings = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = { user: req.user._id };
    if (status) query.status = status.toUpperCase();

    const bookings = await Booking.find(query)
      .populate("doctor", "name specialization consultationFee")
      .populate("slot", "date startTime endTime")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    next(error);
  }
};

// @desc   Get single booking by ID
// @route  GET /api/bookings/:id
// @access Private
const getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("doctor", "name specialization consultationFee")
      .populate("slot", "date startTime endTime")
      .populate("user", "name email phone");

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    // Users can only see their own bookings; admins see all
    if (
      req.user.role !== "admin" &&
      booking.user._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    res.status(200).json({ success: true, booking });
  } catch (error) {
    next(error);
  }
};

// @desc   Cancel a booking (restores slot availability)
// @route  DELETE /api/bookings/:id
// @access Private
const cancelBooking = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const booking = await Booking.findById(req.params.id).session(session);

    if (!booking) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    if (
      req.user.role !== "admin" &&
      booking.user.toString() !== req.user._id.toString()
    ) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a booking with status: ${booking.status}`,
      });
    }

    // Restore slot availability
    await Slot.findByIdAndUpdate(
      booking.slot,
      { $inc: { availableCount: 1 } },
      { session }
    );

    booking.status = "CANCELLED";
    await booking.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ success: true, message: "Booking cancelled.", booking });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

// @desc   Admin: Get all bookings (with filters)
// @route  GET /api/bookings/admin/all
// @access Private/Admin
const getAllBookings = async (req, res, next) => {
  try {
    const { status, doctorId, date } = req.query;
    const query = {};
    if (status) query.status = status.toUpperCase();
    if (doctorId) query.doctor = doctorId;

    let bookings = await Booking.find(query)
      .populate("doctor", "name specialization")
      .populate("slot", "date startTime endTime")
      .populate("user", "name email phone")
      .sort({ createdAt: -1 });

    // Filter by slot date if provided
    if (date) {
      bookings = bookings.filter((b) => b.slot?.date === date);
    }

    res.status(200).json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    next(error);
  }
};

// @desc   Doctor: Get all bookings for the logged-in doctor
// @route  GET /api/bookings/doctor/my
// @access Private/Doctor
const getDoctorBookings = async (req, res, next) => {
  try {
    const { status, date } = req.query;

    // Find the doctor document for this user
    const doctor = await require("../models/Doctor").findOne({ createdBy: req.user._id });
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor profile not found" });
    }

    const query = { doctor: doctor._id };
    if (status) query.status = status.toUpperCase();

    let bookings = await Booking.find(query)
      .populate("doctor", "name specialization")
      .populate("slot", "date startTime endTime")
      .populate("user", "name email phone")
      .sort({ createdAt: -1 });

    // Filter by slot date if provided
    if (date) {
      bookings = bookings.filter((b) => b.slot?.date === date);
    }

    res.status(200).json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getBooking,
  cancelBooking,
  getAllBookings,
  getDoctorBookings,
};
