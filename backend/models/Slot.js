const mongoose = require("mongoose");

/**
 * Slot represents a single appointment slot for a doctor.
 *
 * CONCURRENCY DESIGN:
 * - `availableCount` starts at 1 (each slot = 1 appointment).
 * - Booking uses findOneAndUpdate with $inc: { availableCount: -1 }
 *   combined with a condition: availableCount > 0.
 * - MongoDB guarantees atomicity at the document level, so two
 *   concurrent requests cannot both decrement from 1 to 0 — only
 *   one will match the condition.
 */
const slotSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    date: {
      type: String, // "YYYY-MM-DD" — easier to query by day
      required: [true, "Date is required"],
      match: [/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"],
    },
    startTime: {
      type: String, // "HH:MM" in 24h format
      required: [true, "Start time is required"],
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time format HH:MM"],
    },
    endTime: {
      type: String,
      required: [true, "End time is required"],
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time format HH:MM"],
    },
    availableCount: {
      type: Number,
      default: 1,
      min: 0,
    },
    totalCount: {
      type: Number,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Compound index: query all slots for a doctor on a date fast
slotSchema.index({ doctor: 1, date: 1 });
slotSchema.index({ doctor: 1, date: 1, availableCount: 1 });
// Enforce uniqueness: a doctor can't have two slots at same time on same day
slotSchema.index({ doctor: 1, date: 1, startTime: 1 }, { unique: true });

module.exports = mongoose.model("Slot", slotSchema);