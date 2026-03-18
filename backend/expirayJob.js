const cron = require("node-cron");
const Booking = require("./models/Booking");
const Slot = require("./models/Slot");

/**
 * PENDING BOOKING EXPIRY JOB
 *
 * Runs every minute. Finds bookings that have been PENDING for more
 * than PENDING_EXPIRY_MINUTES and marks them FAILED, restoring
 * slot availability.
 *
 * In a production system this would be a distributed job (e.g. BullMQ
 * or a dedicated worker), but for this assessment a cron is sufficient.
 */
const startExpiryJob = () => {
  const expiryMinutes = parseInt(process.env.PENDING_EXPIRY_MINUTES || "2", 10);

  // Runs every minute: "*/1 * * * *"
  cron.schedule("*/1 * * * *", async () => {
    try {
      const cutoff = new Date(Date.now() - expiryMinutes * 60 * 1000);

      // Find all expired PENDING bookings
      const expiredBookings = await Booking.find({
        status: "PENDING",
        pendingSince: { $lte: cutoff },
      });

      if (expiredBookings.length === 0) return;

      const bookingIds = expiredBookings.map((b) => b._id);
      const slotIds = [...new Set(expiredBookings.map((b) => b.slot.toString()))];

      // Mark bookings as FAILED
      await Booking.updateMany(
        { _id: { $in: bookingIds } },
        {
          status: "FAILED",
          failedAt: new Date(),
          failReason: `Auto-expired after ${expiryMinutes} minutes in PENDING state.`,
        }
      );

      // Count how many bookings expired per slot and restore availability
      const slotRestoreMap = {};
      expiredBookings.forEach((b) => {
        const slotId = b.slot.toString();
        slotRestoreMap[slotId] = (slotRestoreMap[slotId] || 0) + 1;
      });

      const restoreOps = Object.entries(slotRestoreMap).map(([slotId, count]) =>
        Slot.findByIdAndUpdate(slotId, { $inc: { availableCount: count } })
      );

      await Promise.all(restoreOps);

      console.log(
        `[CRON] Expired ${expiredBookings.length} PENDING booking(s) after ${expiryMinutes} min.`
      );
    } catch (error) {
      console.error("[CRON] Expiry job error:", error.message);
    }
  });

  console.log(`✅ Booking expiry cron started (${expiryMinutes} min timeout)`);
};

module.exports = { startExpiryJob };