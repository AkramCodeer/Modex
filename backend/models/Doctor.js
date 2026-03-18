const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Doctor name is required"],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    specialization: {
      type: String,
      required: [true, "Specialization is required"],
      trim: true,
      // e.g. "Cardiology", "General Physician", "Dermatology"
    },
    qualification: {
      type: String,
      trim: true,
      default: "MBBS",
    },
    experience: {
      type: Number, // years
      default: 0,
      min: 0,
    },
    consultationFee: {
      type: Number,
      required: [true, "Consultation fee is required"],
      min: 0,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 500,
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

// Index for fast filtering by specialization
doctorSchema.index({ specialization: 1 });
doctorSchema.index({ isActive: 1 });

module.exports = mongoose.model("Doctor", doctorSchema);