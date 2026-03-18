const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    slot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Slot",
      required: true,
    },
    patientName: {
      type: String,
      required: [true, "Patient name is required"],
      trim: true,
    },
    patientAge: {
      type: Number,
      min: 0,
      max: 150,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "FAILED", "CANCELLED"],
      default: "PENDING",
    },
    confirmedAt: {
      type: Date,
    },
    failedAt: {
      type: Date,
    },
    failReason: {
      type: String,
    },
    // Used by the expiry cron job
    pendingSince: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Indexes for fast queries
bookingSchema.index({ user: 1, status: 1 });
bookingSchema.index({ slot: 1, status: 1 });
bookingSchema.index({ status: 1, pendingSince: 1 }); // used by cron expiry job

// A user can only have one active (non-failed, non-cancelled) booking per slot
bookingSchema.index(
  { user: 1, slot: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["PENDING", "CONFIRMED"] } },
  }
);

module.exports = mongoose.model("Booking", bookingSchema);