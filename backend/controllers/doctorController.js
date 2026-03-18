const Doctor = require("../models/Doctor");
const User = require("../models/User");

// Simple in-memory cache for doctor list (invalidated on write)
let doctorsCache = null;
let cacheTimestamp = null;
const CACHE_TTL_MS = 60 * 1000; // 1 minute

const invalidateCache = () => {
  doctorsCache = null;
  cacheTimestamp = null;
};

// @desc   Get all active doctors (with optional specialization filter)
// @route  GET /api/doctors
// @access Public
const getDoctors = async (req, res, next) => {
  try {
    const { specialization, search } = req.query;

    // Only use cache for unfiltered requests
    const isFiltered = specialization || search;
    if (!isFiltered && doctorsCache && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
      return res.status(200).json({
        success: true,
        fromCache: true,
        count: doctorsCache.length,
        doctors: doctorsCache,
      });
    }

    // Get doctors stored in the Doctor collection
    // If none exist, auto-create Doctor records from users with role "doctor"
    let doctors = await Doctor.find({ isActive: true })
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });

    if (doctors.length === 0) {
      console.log('No Doctor profiles found; creating from users with role=doctor');
      const doctorUsers = await User.find({ role: { $regex: /^doctor$/i } }).select("name");
      const created = await Promise.all(
        doctorUsers.map((user) =>
          Doctor.findOneAndUpdate(
            { createdBy: user._id },
            {
              name: user.name,
              specialization: "General Physician",
              consultationFee: 500,
              createdBy: user._id,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          )
        )
      );
      doctors = created;
    }

    // Apply filters if provided
    if (specialization) {
      doctors = doctors.filter(doc => 
        doc.specialization && doc.specialization.toLowerCase().includes(specialization.toLowerCase())
      );
    }
    if (search) {
      doctors = doctors.filter(doc => 
        doc.name && doc.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Cache only when we have some doctors to return.
    // This avoids returning an empty list indefinitely if the cache was populated before any doctors existed.
    if (!isFiltered) {
      if (doctors.length > 0) {
        doctorsCache = doctors;
        cacheTimestamp = Date.now();
      } else {
        doctorsCache = null;
        cacheTimestamp = null;
      }
    }

    console.log('Returning doctors:', doctors.length);
    res.status(200).json({ success: true, count: doctors.length, doctors });
  } catch (error) {
    console.error('Error in getDoctors:', error);
    next(error);
  }
};

// @desc   Get single doctor
// @route  GET /api/doctors/:id
// @access Public
const getDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate("createdBy", "name");
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found." });
    }
    res.status(200).json({ success: true, doctor });
  } catch (error) {
    next(error);
  }
};

// @desc   Create doctor
// @route  POST /api/doctors
// @access Private/Admin
const createDoctor = async (req, res, next) => {
  try {
    const { name, specialization, qualification, experience, consultationFee, bio } =
      req.body;

    const doctor = await Doctor.create({
      name,
      specialization,
      qualification,
      experience,
      consultationFee,
      bio,
      createdBy: req.user._id,
    });

    invalidateCache();
    res.status(201).json({ success: true, doctor });
  } catch (error) {
    next(error);
  }
};

// @desc   Update doctor
// @route  PUT /api/doctors/:id
// @access Private/Admin
const updateDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found." });
    }

    invalidateCache();
    res.status(200).json({ success: true, doctor });
  } catch (error) {
    next(error);
  }
};

// @desc   Delete (soft-delete) doctor
// @route  DELETE /api/doctors/:id
// @access Private/Admin
const deleteDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found." });
    }

    invalidateCache();
    res.status(200).json({ success: true, message: "Doctor deactivated." });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDoctors, getDoctor, createDoctor, updateDoctor, deleteDoctor };