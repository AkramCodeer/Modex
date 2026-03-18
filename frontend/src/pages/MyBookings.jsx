import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { bookingsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import StatusBadge from "../components/common/StatusBadge";
import "./MyBookings.css";

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const toast = useToast();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    loadBookings();
  }, [isAuthenticated, navigate]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const response = await bookingsAPI.getMyBookings();
      setBookings(response.bookings || response.data?.bookings || []);
    } catch (err) {
      toast.error("Failed to load bookings");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId) => {
    if (window.confirm("Are you sure you want to cancel this booking?")) {
      try {
        await bookingsAPI.cancel(bookingId);
        toast.success("Booking cancelled");
        loadBookings();
      } catch (err) {
        toast.error(err.message || "Failed to cancel booking");
      }
    }
  };

  const getFilteredBookings = () => {
    if (filter === "all") return bookings;
    return bookings.filter(
      (b) => b.status?.toUpperCase() === filter.toUpperCase(),
    );
  };

  const filteredBookings = getFilteredBookings();

  if (loading) {
    return <div className="loading">Loading your bookings...</div>;
  }

  return (
    <div className="my-bookings-page">
      <div className="my-bookings-container">
        <div className="my-bookings-header">
          <h1 className="my-bookings-title">My Bookings</h1>
        </div>

        {bookings.length === 0 ? (
          <div className="no-bookings">
            <p>No bookings yet.</p>
            <button
              className="book-now-btn"
              onClick={() => navigate("/booking")}
            >
              Book Now
            </button>
          </div>
        ) : (
          <>
            <div className="my-bookings-filters">
              <button
                className={`filter-btn ${filter === "all" ? "active" : ""}`}
                onClick={() => setFilter("all")}
              >
                All ({bookings.length})
              </button>
              <button
                className={`filter-btn ${filter === "PENDING" ? "active" : ""}`}
                onClick={() => setFilter("PENDING")}
              >
                Pending ({bookings.filter((b) => b.status === "PENDING").length})
              </button>
              <button
                className={`filter-btn ${filter === "CONFIRMED" ? "active" : ""}`}
                onClick={() => setFilter("CONFIRMED")}
              >
                Confirmed (
                {bookings.filter((b) => b.status === "CONFIRMED").length})
              </button>
              <button
                className={`filter-btn ${filter === "COMPLETED" ? "active" : ""}`}
                onClick={() => setFilter("COMPLETED")}
              >
                Completed (
                {bookings.filter((b) => b.status === "COMPLETED").length})
              </button>
            </div>

            <div className="bookings-grid">
              {filteredBookings.map((booking) => (
                <div key={booking._id} className="booking-card">
                  <div className="booking-info">
                    <h3>
                      {booking.doctor?.name ||
                        booking.doctorId?.name ||
                        "Dr. Unknown"}
                    </h3>
                    <div className="booking-detail">
                      <strong>Specialization:</strong>{" "}
                      {booking.doctor?.specialization ||
                        booking.doctorId?.specialization ||
                        "N/A"}
                    </div>
                    <div className="booking-detail">
                      <strong>Date:</strong>{" "}
                      {booking.slot?.date
                        ? new Date(booking.slot.date).toLocaleDateString()
                        : booking.slotId?.date
                          ? new Date(booking.slotId.date).toLocaleDateString()
                          : "N/A"}
                    </div>
                    {(booking.slot || booking.slotId) && (
                      <div className="booking-detail">
                        <strong>Time:</strong>{" "}
                        {booking.slot?.startTime ||
                          booking.slotId?.startTime ||
                          "N/A"}{" "}
                        -{" "}
                        {booking.slot?.endTime ||
                          booking.slotId?.endTime ||
                          "N/A"}
                      </div>
                    )}
                    <div className="booking-detail">
                      <strong>Fee:</strong> $
                      {booking.doctor?.consultationFee ||
                        booking.doctorId?.consultationFee ||
                        "N/A"}
                    </div>
                  </div>

                  <div className="booking-actions">
                    <StatusBadge status={booking.status} size="md" />
                    {booking.status !== "COMPLETED" &&
                      booking.status !== "CANCELLED" && (
                        <button
                          className="cancel-btn"
                          onClick={() => handleCancel(booking._id)}
                        >
                          Cancel
                        </button>
                      )}
                  </div>
                </div>
              ))}

              {filteredBookings.length === 0 && (
                <p style={{ textAlign: "center", color: "#666" }}>
                  No {filter} bookings
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MyBookings;
