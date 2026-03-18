import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Navbar.css";

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          {/* <div className="auth-brand"> */}
          <span className="auth-brand-icon">✦</span>
          <span className="auth-brand-name">MedBook</span>
          {/* </div> */}
        </Link>

        <ul className="nav-menu">
          <li className="nav-item">
            <Link to="/" className="nav-link">
              Home
            </Link>
          </li>

          {isAuthenticated ? (
            <>
              {user?.role === "user" && (
                <>
                  <li className="nav-item">
                    <Link to="/booking" className="nav-link">
                      Book Appointment
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link to="/my-bookings" className="nav-link">
                      My Bookings
                    </Link>
                  </li>
                </>
              )}

              {user?.role === "doctor" && (
                <li className="nav-item">
                  <Link to="/doctor-dashboard" className="nav-link">
                    Doctor Dashboard
                  </Link>
                </li>
              )}

              {user?.role === "admin" && (
                <li className="nav-item">
                  <Link to="/admin" className="nav-link admin-link">
                    Admin Dashboard
                  </Link>
                </li>
              )}

              <li className="nav-item dropdown">
                <button className="nav-link dropdown-toggle">
                  {user?.name || "Account"}
                </button>
                <div className="dropdown-menu">
                  <button
                    className="dropdown-item logout-btn"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              </li>
            </>
          ) : (
            <>
              <li className="nav-item">
                <Link to="/login" className="nav-link">
                  Login
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/register" className="nav-link register-link">
                  Register
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
