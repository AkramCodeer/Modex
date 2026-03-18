const express = require("express");
const {
  getSlots,
  getSlot,
  getAvailableSlots,
  createSlot,
  createBulkSlots,
  deleteSlot,
} = require("../controllers/slotController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/", getSlots);          // GET /api/slots?doctorId=&date=
router.get("/available", getAvailableSlots); // GET /api/slots/available?doctorId=&date=
router.get("/:id", getSlot);
router.post("/", protect, authorize("admin"), createSlot);
router.post("/bulk", protect, authorize("admin"), createBulkSlots);
router.delete("/:id", protect, authorize("admin"), deleteSlot);

module.exports = router;