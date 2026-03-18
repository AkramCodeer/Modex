const jwt = require("jsonwebtoken");
const User = require("../Models/User");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const sendTokenResponse = (user, statusCode, res) => {
  const token = signToken(user._id);
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
    },
  });
};

// @desc   Register new user
// @route  POST /api/auth/register
// @access Public
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;

    // Prevent self-assigning admin role
    const safeRole = role === "admin" ? "user" : role;

    const user = await User.create({ name, email, password, phone, role: safeRole });
    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

// @desc   Login
// @route  POST /api/auth/login
// @access Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc   Get current logged-in user
// @route  GET /api/auth/me
// @access Private
const getMe = async (req, res) => {
  res.status(200).json({ success: true, user: req.user });
};

// @desc   Verify token and get current user
// @route  GET /api/auth/verify
// @access Private
const verify = async (req, res) => {
  res.status(200).json({ success: true, user: req.user });
};

// @desc   Create admin (only existing admins can do this)
// @route  POST /api/auth/create-admin
// @access Private/Admin
const createAdmin = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;
    const user = await User.create({ name, email, password, phone, role: "admin" });
    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe, verify, createAdmin };