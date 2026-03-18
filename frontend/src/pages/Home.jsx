import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doctorsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/common/StatusBadge';

const Home = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    try {
      setLoading(true);
      const response = await doctorsAPI.getAll();
      setDoctors(response.doctors || response.data?.doctors || []);
    } catch (err) {
      toast.error('Failed to load doctors');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = (doctorId) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/booking', search: `?doctorId=${doctorId}` } } });
      return;
    }
    navigate(`/booking?doctorId=${doctorId}`);
  };

  if (loading) {
    return <div className="loading">Loading doctors...</div>;
  }

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1>Find & Book Your Doctor</h1>
        <p style={{ color: '#666', fontSize: '1.1rem' }}>
          Browse our experienced medical professionals and book your appointment
        </p>
      </div>

      {doctors.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p>No doctors available at the moment.</p>
        </div>
      ) : (
        <div className="doctors-grid">
          {doctors.map((doctor) => (
            <div key={doctor._id} className="doctor-card">
              <div className="doctor-header">
                <h3>{doctor.name}</h3>
                {doctor.isActive && (
                  <StatusBadge status="ACTIVE" size="sm" />
                )}
              </div>
              <p className="doctor-spec">{doctor.specialization}</p>
              <p className="doctor-detail">
                <strong>Qualification:</strong> {doctor.qualification}
              </p>
              <p className="doctor-detail">
                <strong>Experience:</strong> {doctor.experience} years
              </p>
              <p className="doctor-detail">
                <strong>Fee:</strong> ${doctor.consultationFee}
              </p>
              {doctor.bio && <p className="doctor-bio">{doctor.bio}</p>}
              <button
                className="btn btn-primary"
                onClick={() => handleBooking(doctor._id)}
                style={{ width: '100%', marginTop: '1rem' }}
              >
                Book Appointment
              </button>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .doctors-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 2rem;
          margin-top: 2rem;
        }

        .doctor-card {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: transform 0.3s, box-shadow 0.3s;
        }

        .doctor-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }

        .doctor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .doctor-header h3 {
          margin: 0;
          color: #333;
        }

        .doctor-spec {
          color: #667eea;
          font-weight: 600;
          margin: 0.5rem 0;
        }

        .doctor-detail {
          color: #666;
          font-size: 0.9rem;
          margin: 0.3rem 0;
        }

        .doctor-bio {
          color: #888;
          font-size: 0.85rem;
          margin-top: 0.5rem;
          font-style: italic;
        }

        .loading {
          text-align: center;
          padding: 3rem;
          font-size: 1.1rem;
          color: #666;
        }
      `}</style>
    </div>
  );
};

export default Home;
