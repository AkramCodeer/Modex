const express = require("express");
const { register, login, getMe, verify, createAdmin } = require("../controllers/authController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.get("/verify", protect, verify);
router.post("/create-admin", protect, authorize("admin"), createAdmin);

module.exports = router;