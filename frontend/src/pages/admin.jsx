import React, { useEffect, useState } from "react";
import { useToast } from "../context/ToastContext";
import { doctorsAPI, slotsAPI, bookingsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/common/StatusBadge";
import "./Admin.css";

const SPECIALIZATIONS = [
  "General Physician",
  "Cardiology",
  "Dermatology",
  "Neurology",
  "Orthopedics",
  "Pediatrics",
  "Psychiatry",
  "Gynecology",
];

const TABS = ["doctors", "slots", "bookings"];

export default function Admin() {
  const toast = useToast();
  const { user } = useAuth();

  const [tab, setTab] = useState("doctors");

  // ── Doctors state ──────────────────────────────────────
  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [docForm, setDocForm] = useState({
    name: "",
    specialization: "",
    qualification: "MBBS",
    experience: "",
    consultationFee: "",
    bio: "",
  });
  const [docErrors, setDocErrors] = useState({});
  const [docSubmitting, setDocSubmitting] = useState(false);

  // ── Slots state ────────────────────────────────────────
  const [slotForm, setSlotForm] = useState({
    doctorId: "",
    date: "",
    startTime: "",
    endTime: "",
  });
  const [slotErrors, setSlotErrors] = useState({});
  const [slotSubmitting, setSlotSubmitting] = useState(false);

  // ── Bookings state ─────────────────────────────────────
  const [allBookings, setAllBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingFilter, setBookingFilter] = useState("ALL");

  // ── Load on mount ──────────────────────────────────────
  useEffect(() => {
    loadDoctors();
    loadBookings();
  }, []);

  const loadDoctors = async () => {
    setDoctorsLoading(true);
    try {
      const res = await doctorsAPI.getAll();
      setDoctors(res.data.doctors);
    } catch (err) {
      toast.error(err.message || "Failed to load doctors.");
    } finally {
      setDoctorsLoading(false);
    }
  };

  const loadBookings = async () => {
    setBookingsLoading(true);
    try {
      const res = await bookingsAPI.getAllAdmin();
      setAllBookings(res.data.bookings);
    } catch (err) {
      toast.error(err.message || "Failed to load bookings.");
    } finally {
      setBookingsLoading(false);
    }
  };

  // ── Doctor form ────────────────────────────────────────
  const validateDoc = () => {
    const e = {};
    if (!docForm.name.trim()) e.name = "Doctor name is required.";
    if (!docForm.specialization.trim())
      e.specialization = "Specialization is required.";
    if (
      !docForm.consultationFee ||
      isNaN(docForm.consultationFee) ||
      Number(docForm.consultationFee) < 0
    )
      e.consultationFee = "Enter a valid consultation fee.";
    setDocErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleDocChange = (field) => (e) => {
    setDocForm((f) => ({ ...f, [field]: e.target.value }));
    if (docErrors[field])
      setDocErrors((err) => ({ ...err, [field]: undefined }));
  };

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    if (!validateDoc()) return;
    setDocSubmitting(true);
    try {
      await doctorsAPI.create({
        ...docForm,
        experience: Number(docForm.experience) || 0,
        consultationFee: Number(docForm.consultationFee),
      });
      toast.success(`Dr. ${docForm.name} added successfully!`);
      setDocForm({
        name: "",
        specialization: "",
        qualification: "MBBS",
        experience: "",
        consultationFee: "",
        bio: "",
      });
      setDocErrors({});
      loadDoctors();
    } catch (err) {
      toast.error(err.message || "Failed to add doctor.");
    } finally {
      setDocSubmitting(false);
    }
  };

  const handleDeleteDoctor = async (id, name) => {
    if (
      !window.confirm(
        `Deactivate Dr. ${name}? They will no longer appear to users.`,
      )
    )
      return;
    try {
      await doctorsAPI.delete(id);
      toast.success("Doctor deactivated.");
      loadDoctors();
    } catch (err) {
      toast.error(err.message || "Failed to deactivate doctor.");
    }
  };

  // ── Slot form ──────────────────────────────────────────
  const validateSlot = () => {
    const e = {};
    if (!slotForm.doctorId) e.doctorId = "Please select a doctor.";
    if (!slotForm.date) e.date = "Date is required.";
    if (!slotForm.startTime) e.startTime = "Start time is required.";
    if (!slotForm.endTime) e.endTime = "End time is required.";
    if (
      slotForm.startTime &&
      slotForm.endTime &&
      slotForm.startTime >= slotForm.endTime
    )
      e.endTime = "End time must be after start time.";
    setSlotErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSlotChange = (field) => (e) => {
    setSlotForm((f) => ({ ...f, [field]: e.target.value }));
    if (slotErrors[field])
      setSlotErrors((err) => ({ ...err, [field]: undefined }));
  };

  const handleAddSlot = async (e) => {
    e.preventDefault();
    if (!validateSlot()) return;
    setSlotSubmitting(true);
    try {
      await slotsAPI.create({
        doctorId: slotForm.doctorId,
        date: slotForm.date,
        startTime: slotForm.startTime,
        endTime: slotForm.endTime,
      });
      toast.success("Slot created successfully!");
      setSlotForm((f) => ({ ...f, startTime: "", endTime: "" }));
      setSlotErrors({});
    } catch (err) {
      toast.error(err.message || "Failed to create slot.");
    } finally {
      setSlotSubmitting(false);
    }
  };

  // ── Derived ────────────────────────────────────────────
  const filteredBookings =
    bookingFilter === "ALL"
      ? allBookings
      : allBookings.filter((b) => b.status === bookingFilter);

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="page-wrapper">
      <div className="container admin-container">
        {/* Page header */}
        <div className="admin-header">
          <div>
            <h1>Admin Dashboard</h1>
            <p className="admin-sub">
              Logged in as <strong>{user?.name}</strong>
            </p>
          </div>
          <div className="admin-stats">
            <div className="admin-stat-chip">
              <span className="stat-num">{doctors.length}</span>
              <span className="stat-lbl">Doctors</span>
            </div>
            <div className="admin-stat-chip">
              <span className="stat-num">
                {allBookings.filter((b) => b.status === "CONFIRMED").length}
              </span>
              <span className="stat-lbl">Confirmed</span>
            </div>
            <div className="admin-stat-chip">
              <span className="stat-num">
                {allBookings.filter((b) => b.status === "PENDING").length}
              </span>
              <span className="stat-lbl">Pending</span>
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="admin-tabs">
          {TABS.map((t) => (
            <button
              key={t}
              className={`admin-tab-btn ${tab === t ? "active" : ""}`}
              onClick={() => setTab(t)}
            >
              {t === "doctors"
                ? "🩺 Doctors"
                : t === "slots"
                  ? "📅 Slots"
                  : "📋 Bookings"}
            </button>
          ))}
        </div>

        {/* ── DOCTORS TAB ── */}
        {tab === "doctors" && (
          <div className="admin-tab-content">
            <div className="card admin-form-card">
              <h3 className="admin-section-title">Add New Doctor</h3>
              <form onSubmit={handleAddDoctor} className="admin-form">
                <div className="admin-form-grid">
                  <div className="form-group">
                    <label className="form-label">Doctor Name *</label>
                    <input
                      className="form-input"
                      placeholder="e.g. Priya Sharma"
                      value={docForm.name}
                      onChange={handleDocChange("name")}
                    />
                    {docErrors.name && (
                      <p className="form-error">⚠ {docErrors.name}</p>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Specialization *</label>
                    <select
                      className="form-input"
                      value={docForm.specialization}
                      onChange={handleDocChange("specialization")}
                    >
                      <option value="">Select specialization…</option>
                      {SPECIALIZATIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    {docErrors.specialization && (
                      <p className="form-error">⚠ {docErrors.specialization}</p>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Qualification</label>
                    <input
                      className="form-input"
                      placeholder="e.g. MBBS, MD"
                      value={docForm.qualification}
                      onChange={handleDocChange("qualification")}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Experience (years)</label>
                    <input
                      className="form-input"
                      type="number"
                      min="0"
                      max="60"
                      placeholder="e.g. 10"
                      value={docForm.experience}
                      onChange={handleDocChange("experience")}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Consultation Fee (₹) *</label>
                    <input
                      className="form-input"
                      type="number"
                      min="0"
                      placeholder="e.g. 500"
                      value={docForm.consultationFee}
                      onChange={handleDocChange("consultationFee")}
                    />
                    {docErrors.consultationFee && (
                      <p className="form-error">
                        ⚠ {docErrors.consultationFee}
                      </p>
                    )}
                  </div>

                  <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                    <label className="form-label">Bio</label>
                    <textarea
                      className="form-input"
                      rows={3}
                      placeholder="Brief description about the doctor…"
                      value={docForm.bio}
                      onChange={handleDocChange("bio")}
                      style={{ resize: "vertical" }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={docSubmitting}
                >
                  {docSubmitting ? "Adding…" : "+ Add Doctor"}
                </button>
              </form>
            </div>

            {/* Doctors list */}
            <div className="admin-list-section">
              <h3 className="admin-section-title">
                All Doctors
                <span className="admin-count">{doctors.length}</span>
              </h3>

              {doctorsLoading ? (
                <div style={{ padding: "2rem", textAlign: "center" }}>
                  <div className="spinner" />
                </div>
              ) : doctors.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🩺</div>
                  <h3>No doctors yet</h3>
                  <p>Add your first doctor using the form above.</p>
                </div>
              ) : (
                <div className="admin-doctors-list">
                  {doctors.map((d) => (
                    <div key={d._id} className="card admin-doctor-row">
                      <div className="admin-doc-avatar">
                        {d.name
                          .split(" ")
                          .slice(0, 2)
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </div>
                      <div className="admin-doc-info">
                        <p className="admin-doc-name">Dr. {d.name}</p>
                        <p className="admin-doc-meta">
                          {d.specialization} · {d.qualification} ·{" "}
                          {d.experience}yrs exp
                        </p>
                      </div>
                      <div className="admin-doc-fee">₹{d.consultationFee}</div>
                      <div
                        className={`admin-doc-status ${d.isActive ? "active" : "inactive"}`}
                      >
                        {d.isActive ? "Active" : "Inactive"}
                      </div>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteDoctor(d._id, d.name)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SLOTS TAB ── */}
        {tab === "slots" && (
          <div className="admin-tab-content">
            <div className="card admin-form-card" style={{ maxWidth: 520 }}>
              <h3 className="admin-section-title">Create Appointment Slot</h3>
              <form onSubmit={handleAddSlot} className="admin-form">
                <div className="form-group">
                  <label className="form-label">Select Doctor *</label>
                  <select
                    className="form-input"
                    value={slotForm.doctorId}
                    onChange={handleSlotChange("doctorId")}
                  >
                    <option value="">Choose a doctor…</option>
                    {doctors.map((d) => (
                      <option key={d._id} value={d._id}>
                        Dr. {d.name} — {d.specialization}
                      </option>
                    ))}
                  </select>
                  {slotErrors.doctorId && (
                    <p className="form-error">⚠ {slotErrors.doctorId}</p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={slotForm.date}
                    min={todayStr}
                    onChange={handleSlotChange("date")}
                  />
                  {slotErrors.date && (
                    <p className="form-error">⚠ {slotErrors.date}</p>
                  )}
                </div>

                <div className="slot-time-row">
                  <div className="form-group">
                    <label className="form-label">Start Time *</label>
                    <input
                      type="time"
                      className="form-input"
                      value={slotForm.startTime}
                      onChange={handleSlotChange("startTime")}
                    />
                    {slotErrors.startTime && (
                      <p className="form-error">⚠ {slotErrors.startTime}</p>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Time *</label>
                    <input
                      type="time"
                      className="form-input"
                      value={slotForm.endTime}
                      onChange={handleSlotChange("endTime")}
                    />
                    {slotErrors.endTime && (
                      <p className="form-error">⚠ {slotErrors.endTime}</p>
                    )}
                  </div>
                </div>

                {/* Preview */}
                {slotForm.doctorId &&
                  slotForm.date &&
                  slotForm.startTime &&
                  slotForm.endTime && (
                    <div className="slot-preview">
                      <span>📅</span>
                      <span>
                        {doctors.find((d) => d._id === slotForm.doctorId)?.name}{" "}
                        on <strong>{slotForm.date}</strong> from{" "}
                        <strong>{slotForm.startTime}</strong> to{" "}
                        <strong>{slotForm.endTime}</strong>
                      </span>
                    </div>
                  )}

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={slotSubmitting}
                >
                  {slotSubmitting ? "Creating…" : "+ Create Slot"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── BOOKINGS TAB ── */}
        {tab === "bookings" && (
          <div className="admin-tab-content">
            <div className="booking-filters" style={{ marginBottom: "1.5rem" }}>
              {["ALL", "CONFIRMED", "PENDING", "FAILED", "CANCELLED"].map(
                (s) => (
                  <button
                    key={s}
                    className={`booking-filter-btn ${bookingFilter === s ? "active" : ""}`}
                    onClick={() => setBookingFilter(s)}
                  >
                    {s}
                    <span className="filter-count">
                      {s === "ALL"
                        ? allBookings.length
                        : allBookings.filter((b) => b.status === s).length}
                    </span>
                  </button>
                ),
              )}
              <button
                className="btn btn-ghost btn-sm"
                onClick={loadBookings}
                style={{ marginLeft: "auto" }}
              >
                ↻ Refresh
              </button>
            </div>

            {bookingsLoading ? (
              <div style={{ padding: "2rem", textAlign: "center" }}>
                <div className="spinner" />
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <h3>No bookings found</h3>
                <p>No bookings match the selected filter.</p>
              </div>
            ) : (
              <div className="admin-bookings-list">
                {filteredBookings.map((b) => (
                  <div key={b._id} className="card admin-booking-row">
                    <div className="ab-col">
                      <p className="ab-label">Doctor</p>
                      <p className="ab-value">Dr. {b.doctor?.name}</p>
                      <p className="ab-sub">{b.doctor?.specialization}</p>
                    </div>
                    <div className="ab-col">
                      <p className="ab-label">Slot</p>
                      <p className="ab-value">{b.slot?.date}</p>
                      <p className="ab-sub">
                        {b.slot?.startTime} – {b.slot?.endTime}
                      </p>
                    </div>
                    <div className="ab-col">
                      <p className="ab-label">Patient</p>
                      <p className="ab-value">{b.patientName}</p>
                      {b.patientAge && (
                        <p className="ab-sub">Age: {b.patientAge}</p>
                      )}
                    </div>
                    <div className="ab-col">
                      <p className="ab-label">Booked By</p>
                      <p className="ab-value">{b.user?.name}</p>
                      <p className="ab-sub">{b.user?.email}</p>
                    </div>
                    <div className="ab-col ab-status">
                      <StatusBadge status={b.status} />
                      <p className="ab-fee">₹{b.doctor?.consultationFee}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
