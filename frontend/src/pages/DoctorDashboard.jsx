import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { bookingsAPI } from '../services/api';
import StatusBadge from '../components/common/StatusBadge';

const DoctorDashboard = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDoctorBookings();
  }, []);

  const loadDoctorBookings = async () => {
    try {
      setLoading(true);
      const response = await bookingsAPI.getDoctorBookings();
      setBookings(response.bookings || []);
    } catch (err) {
      toast.error('Failed to load bookings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      await bookingsAPI.update(bookingId, { status });
      toast.success(`Booking ${status.toLowerCase()}`);
      loadDoctorBookings(); // Refresh the list
    } catch (err) {
      toast.error('Failed to update booking status');
    }
  };

  if (loading) {
    return <div className="loading">Loading your appointments...</div>;
  }

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1>Doctor Dashboard</h1>
        <p>Welcome back, Dr. {user?.name}</p>
      </div>

      <div className="dashboard-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="stat-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>Total Appointments</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea', margin: 0 }}>{bookings.length}</p>
        </div>
        <div className="stat-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>Pending</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f39c12', margin: 0 }}>
            {bookings.filter(b => b.status === 'pending').length}
          </p>
        </div>
        <div className="stat-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>Confirmed</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#27ae60', margin: 0 }}>
            {bookings.filter(b => b.status === 'confirmed').length}
          </p>
        </div>
      </div>

      <div className="bookings-section">
        <h2>Your Appointments</h2>

        {bookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <p>No appointments scheduled yet.</p>
          </div>
        ) : (
          <div className="bookings-list" style={{ display: 'grid', gap: '1rem' }}>
            {bookings.map((booking) => (
              <div key={booking._id} className="booking-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <div className="booking-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, color: '#333' }}>
                    {booking.patientName || 'Patient'}
                  </h3>
                  <StatusBadge status={booking.status} />
                </div>

                <div className="booking-details" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <strong>Date:</strong> {booking.slot?.date ? new Date(booking.slot.date).toLocaleDateString() : 'N/A'}
                  </div>
                  <div>
                    <strong>Time:</strong> {booking.slot?.startTime} - {booking.slot?.endTime}
                  </div>
                  <div>
                    <strong>Patient Email:</strong> {booking.patientEmail}
                  </div>
                </div>

                {booking.status === 'pending' && (
                  <div className="booking-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn btn-success"
                      onClick={() => updateBookingStatus(booking._id, 'confirmed')}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                    >
                      Confirm
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => updateBookingStatus(booking._id, 'cancelled')}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorDashboard;