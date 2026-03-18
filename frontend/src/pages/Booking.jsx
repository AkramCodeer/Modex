import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { doctorsAPI, slotsAPI, bookingsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import "./MyBookings.css"

// ── Inline Calendar Component ──────────────────────────────────────────────
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function Calendar({ value, onChange }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const selected = value ? new Date(value + "T00:00:00") : null;

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleDayClick = (day) => {
    const d = new Date(viewYear, viewMonth, day);
    if (d < today) return; // past — disabled
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, "0");
    const dd   = String(d.getDate()).padStart(2, "0");
    onChange(`${yyyy}-${mm}-${dd}`);
  };

  const isPast = (day) => new Date(viewYear, viewMonth, day) < today;
  const isToday = (day) =>
    day === today.getDate() &&
    viewMonth === today.getMonth() &&
    viewYear === today.getFullYear();
  const isSelected = (day) =>
    selected &&
    day === selected.getDate() &&
    viewMonth === selected.getMonth() &&
    viewYear === selected.getFullYear();

  // grid: leading empty cells + day cells
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="cal-wrap">
      {/* Header */}
      <div className="cal-header">
        <button type="button" className="cal-nav" onClick={prevMonth}>‹</button>
        <span className="cal-title">{MONTHS[viewMonth]} {viewYear}</span>
        <button type="button" className="cal-nav" onClick={nextMonth}>›</button>
      </div>

      {/* Day labels */}
      <div className="cal-grid">
        {DAYS.map(d => (
          <div key={d} className="cal-day-label">{d}</div>
        ))}

        {/* Day cells */}
        {cells.map((day, idx) =>
          day === null ? (
            <div key={`e-${idx}`} />
          ) : (
            <button
              key={day}
              type="button"
              className={`cal-day
                ${isPast(day)   ? "cal-day--past"     : ""}
                ${isToday(day)  ? "cal-day--today"    : ""}
                ${isSelected(day) ? "cal-day--selected" : ""}
              `}
              onClick={() => handleDayClick(day)}
              disabled={isPast(day)}
              title={isPast(day) ? "Past date" : ""}
            >
              {day}
            </button>
          )
        )}
      </div>

      {/* Selected date readout */}
      {value && (
        <div className="cal-selected-label">
          📅 Selected: <strong>{new Date(value + "T00:00:00").toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}</strong>
        </div>
      )}
    </div>
  );
}

// ── Main Booking Component ─────────────────────────────────────────────────
const Booking = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();

  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(
    searchParams.get("doctorId") || ""
  );
  const [bookingDate, setBookingDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [patientName, setPatientName] = useState(user?.name || "");
  const [patientAge, setPatientAge] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!isAuthenticated) { navigate("/login"); return; }
    loadDoctors();
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (selectedDoctor && bookingDate) {
      loadAvailableSlots();
      setSelectedSlot(""); // reset slot on date/doctor change
    }
  }, [selectedDoctor, bookingDate]);

  const loadDoctors = async () => {
    try {
      const response = await doctorsAPI.getAll();
      setDoctors(response.doctors || response.data?.doctors || []);
    } catch {
      toast.error("Failed to load doctors");
    }
  };

  const loadAvailableSlots = async () => {
    try {
      setSlotsLoading(true);
      const response = await slotsAPI.getAvailable(selectedDoctor, bookingDate);
      setAvailableSlots(response.slots || response.data?.slots || []);
    } catch {
      toast.error("Failed to load slots");
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!selectedDoctor || !selectedSlot || !patientName.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      setLoading(true);
      await bookingsAPI.create({
        slotId: selectedSlot,
        patientName: patientName.trim(),
        patientAge: patientAge ? parseInt(patientAge) : undefined,
        reason: reason.trim() || undefined,
      });
      toast.success("Booking confirmed!");
      navigate("/my-bookings");
    } catch (err) {
      toast.error(err.message || "Booking failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bk-page">
      <div className="bk-card">
        <h1 className="bk-title">Book an Appointment</h1>

        <form onSubmit={handleBooking} className="bk-form">

          {/* Doctor select */}
          <div className="form-group">
            <label className="form-label">Select Doctor *</label>
            <select
              className="form-input"
              value={selectedDoctor}
              onChange={(e) => { setSelectedDoctor(e.target.value); setBookingDate(""); setAvailableSlots([]); setSelectedSlot(""); }}
              required
            >
              <option value="">— Choose a doctor —</option>
              {doctors.map((doc) => (
                <option key={doc._id} value={doc._id}>
                  Dr. {doc.name} · {doc.specialization}
                </option>
              ))}
            </select>
          </div>

          {/* Calendar — only show once a doctor is chosen */}
          {selectedDoctor && (
            <div className="form-group">
              <label className="form-label">Select Date *</label>
              <Calendar value={bookingDate} onChange={setBookingDate} />
            </div>
          )}

          {/* Slots */}
          {selectedDoctor && bookingDate && (
            <div className="form-group">
              <label className="form-label">
                Available Slots
                {availableSlots.length > 0 && (
                  <span className="slots-badge">{availableSlots.filter(s => s.availableCount > 0).length} open</span>
                )}
              </label>

              {slotsLoading ? (
                <div className="slots-loading">
                  <span className="spin" />
                  Loading slots…
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="slots-empty">
                  <span>🗓</span> No slots available for this date. Try another day.
                </div>
              ) : (
                <div className="slots-grid">
                  {availableSlots.map((slot) => {
                    const isBooked = slot.availableCount === 0;
                    const isActive = selectedSlot === slot._id;
                    return (
                      <button
                        key={slot._id}
                        type="button"
                        disabled={isBooked}
                        onClick={() => setSelectedSlot(slot._id)}
                        className={`slot-btn${isActive ? " slot-btn--active" : ""}${isBooked ? " slot-btn--booked" : ""}`}
                      >
                        <span className="slot-time">{slot.startTime}</span>
                        <span className="slot-sep">–</span>
                        <span className="slot-time">{slot.endTime}</span>
                        <span className={`slot-pill ${isBooked ? "pill-booked" : "pill-open"}`}>
                          {isBooked ? "Full" : "Open"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Patient details — only after slot chosen */}
          {selectedSlot && (
            <div className="patient-section">
              <div className="patient-section-label">Patient Details</div>

              <div className="form-group">
                <label className="form-label">Patient Name *</label>
                <input
                  className="form-input"
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Full name"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Age</label>
                <input
                  className="form-input"
                  type="number"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  placeholder="Optional"
                  min="0"
                  max="150"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Reason for Visit</label>
                <textarea
                  className="form-input"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Briefly describe symptoms or reason (optional)"
                  rows={3}
                  style={{ resize: "vertical", minHeight: 80 }}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading || !selectedSlot}
          >
            {loading ? "Confirming…" : "Confirm Booking"}
          </button>
        </form>
      </div>

      <style>{`
        .bk-page {
          min-height: 100vh;
          padding: 2rem 1rem 4rem;
          background: #f8f9fa;
          display: flex;
          justify-content: center;
          align-items: flex-start;
        }
        .bk-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
          padding: 2.5rem;
          width: 100%;
          max-width: 600px;
        }
        .bk-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #111;
          margin-bottom: 2rem;
        }
        .bk-form {
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .form-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .form-input {
          padding: 0.75rem 1rem;
          border: 1.5px solid #e5e7eb;
          border-radius: 8px;
          font-size: 1rem;
          color: #374151;
          background: white;
          transition: border-color 0.2s, box-shadow 0.2s;
          outline: none;
          font-family: inherit;
        }
        .form-input:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102,126,234,0.12);
        }

        /* ── Calendar ── */
        .cal-wrap {
          background: #fafafa;
          border: 1.5px solid #e5e7eb;
          border-radius: 12px;
          padding: 1.25rem;
        }
        .cal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }
        .cal-title {
          font-weight: 700;
          font-size: 1rem;
          color: #111;
        }
        .cal-nav {
          background: white;
          border: 1.5px solid #e5e7eb;
          border-radius: 8px;
          width: 34px; height: 34px;
          font-size: 1.1rem;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: #374151;
          transition: background 0.15s, border-color 0.15s;
          line-height: 1;
        }
        .cal-nav:hover { background: #f0f4ff; border-color: #667eea; color: #667eea; }

        .cal-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
        }
        .cal-day-label {
          text-align: center;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #9ca3af;
          padding: 6px 0;
          letter-spacing: 0.04em;
        }
        .cal-day {
          aspect-ratio: 1;
          border: none;
          background: transparent;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
          font-family: inherit;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cal-day:hover:not(:disabled):not(.cal-day--selected) {
          background: #f0f4ff;
          color: #667eea;
        }
        .cal-day--past {
          color: #d1d5db;
          cursor: not-allowed;
        }
        .cal-day--today {
          background: #f0f4ff;
          color: #667eea;
          font-weight: 700;
          outline: 1.5px solid #667eea;
          outline-offset: -1.5px;
        }
        .cal-day--selected {
          background: #667eea !important;
          color: white !important;
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(102,126,234,0.35);
        }
        .cal-selected-label {
          margin-top: 1rem;
          padding: 0.6rem 0.875rem;
          background: #f0f4ff;
          border-radius: 8px;
          font-size: 0.85rem;
          color: #4338ca;
          border: 1px solid rgba(102,126,234,0.2);
        }

        /* ── Slots ── */
        .slots-badge {
          font-size: 0.72rem;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 20px;
          background: #dcfce7;
          color: #15803d;
        }
        .slots-loading {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          color: #6b7280;
          font-size: 0.9rem;
          padding: 1rem 0;
        }
        .spin {
          display: inline-block;
          width: 18px; height: 18px;
          border: 2px solid #e5e7eb;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .slots-empty {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          background: #f9fafb;
          border: 1px dashed #e5e7eb;
          border-radius: 8px;
          color: #6b7280;
          font-size: 0.9rem;
        }
        .slots-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          gap: 0.5rem;
        }
        .slot-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0.7rem 0.5rem 0.5rem;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          background: white;
          cursor: pointer;
          transition: all 0.15s;
          font-family: inherit;
          gap: 2px;
        }
        .slot-btn:hover:not(:disabled):not(.slot-btn--active) {
          border-color: #667eea;
          background: #f0f4ff;
        }
        .slot-btn--active {
          border-color: #667eea;
          background: #667eea;
          color: white;
          box-shadow: 0 4px 12px rgba(102,126,234,0.3);
          transform: translateY(-1px);
        }
        .slot-btn--booked {
          opacity: 0.4;
          cursor: not-allowed;
          background: #f9fafb;
        }
        .slot-time {
          font-size: 0.95rem;
          font-weight: 600;
          line-height: 1;
        }
        .slot-sep {
          font-size: 0.7rem;
          opacity: 0.6;
        }
        .slot-pill {
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 2px 6px;
          border-radius: 10px;
          margin-top: 3px;
        }
        .pill-open   { background: #dcfce7; color: #15803d; }
        .pill-booked { background: #f3f4f6; color: #9ca3af; }
        .slot-btn--active .pill-open { background: rgba(255,255,255,0.2); color: white; }

        /* ── Patient section ── */
        .patient-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 1.25rem;
          background: #f9fafb;
          border-radius: 12px;
          border: 1.5px solid #e5e7eb;
        }
        .patient-section-label {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #9ca3af;
        }

        /* ── Buttons ── */
        .btn {
          border: none;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          font-family: inherit;
        }
        .btn-primary {
          background: #667eea;
          color: white;
          padding: 0.875rem 2rem;
          width: 100%;
        }
        .btn-primary:hover:not(:disabled) {
          background: #5a67d8;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102,126,234,0.35);
        }
        .btn-primary:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }
        .btn-lg { font-size: 1.05rem; padding: 1rem 2rem; }

        @media (max-width: 480px) {
          .bk-card { padding: 1.5rem; }
          .slots-grid { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); }
        }
      `}</style>
    </div>
  );
};

export default Booking;