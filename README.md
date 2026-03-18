# Doctor Appointment Booking System (MODEX)

A full-stack web application for booking doctor appointments with real-time slot management and admin dashboard.

## Project Structure

```
modex/
├── backend/
│   ├── controllers/        # Business logic for each route
│   ├── models/            # MongoDB schemas (User, Doctor, Slot, Booking)
│   ├── routes/            # API endpoints
│   ├── middleware/        # Authentication & authorization
│   ├── server.js          # Main Express server
│   ├── db.js              # MongoDB connection
│   ├── errorHandler.js    # Centralized error handling
│   ├── expirayJob.js      # Cron job for pending booking expiry
│   ├── package.json       # Dependencies
│   ├── .env.example       # Environment variables template
│   └── .env               # (Create from .env.example)
│
└── frontend/
    ├── src/
    │   ├── pages/         # Page components (Home, Booking, Admin, etc.)
    │   ├── services/      # API client (api.js)
    │   ├── App.jsx        # Main app component with routes
    │   └── main.jsx       # Entry point
    ├── components/        # Reusable components
    │   └── common/        # Shared components (Navbar, StatusBadge, etc.)
    ├── context/           # React Context (Auth, Toast, App state)
    ├── package.json       # Dependencies
    └── .env.example       # Environment variables template
```

## Prerequisites

- Node.js (v14+)
- MongoDB Atlas account (or local MongoDB)
- npm or yarn

## Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create .env file** from .env.example:
   ```bash
   cp .env.example .env
   ```
   Update the values:
   ```
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_secret_key
   NODE_ENV=development
   PORT=5000
   ```

4. **Start the server:**
   ```bash
   npm start
   ```
   Or with auto-reload:
   ```bash
   npm run dev
   ```

Server will run on `http://localhost:5000`

## Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create .env file** from .env.example:
   ```bash
   cp .env.example .env
   ```
   Ensure it matches your backend URL:
   ```
   VITE_API_URL=http://localhost:5000/api
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

App will run on `http://localhost:5173` (Vite default)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify` - Verify token
- `GET /api/auth/me` - Get current user

### Doctors (Admin only)
- `GET /api/doctors` - Get all active doctors
- `GET /api/doctors/:id` - Get doctor details
- `POST /api/doctors` - Create doctor (admin)
- `PUT /api/doctors/:id` - Update doctor (admin)
- `DELETE /api/doctors/:id` - Deactivate doctor (admin)

### Slots (Admin only)
- `GET /api/slots?doctorId=&date=` - Get available slots
- `GET /api/slots/:id` - Get slot details
- `POST /api/slots` - Create slot (admin)
- `POST /api/slots/bulk` - Bulk create slots (admin)
- `DELETE /api/slots/:id` - Deactivate slot (admin)

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings/user/my` - Get user's bookings
- `GET /api/bookings/:id` - Get booking details
- `DELETE /api/bookings/:id` - Cancel booking
- `GET /api/bookings/admin/all` - Get all bookings (admin)

## Features

### For Users
- Browse available doctors by specialization
- View available time slots
- Book appointments
- Manage bookings (view, cancel)
- Real-time notifications

### For Admins
- Add/manage doctors
- Create time slots (single or bulk)
- View all bookings
- Monitor appointment status

### Technical Features
- **Concurrency**: Atomic slot booking prevents overbooking
- **Caching**: Redis-like in-memory caching for doctors and slots
- **Security**: JWT-based authentication, role-based authorization
- **Error Handling**: Centralized error handling middleware
- **Auto-expiry**: Cron job to auto-expire pending bookings after 2 minutes

## Database Models

### User
```
{
  name, email, password, role (user/admin), phone,
  timestamps
}
```

### Doctor
```
{
  name, specialization, qualification, experience,
  consultationFee, bio, isActive, createdBy,
  timestamps
}
```

### Slot
```
{
  doctor, date (YYYY-MM-DD), startTime, endTime,
  availableCount, totalCount, isActive, createdBy,
  indices: { doctor, date }, { doctor, date, startTime (unique) },
  timestamps
}
```

### Booking
```
{
  user, doctor, slot, patientName, patientAge, reason,
  status (PENDING/CONFIRMED/FAILED/CANCELLED),
  confirmedAt, failedAt, failReason, pendingSince,
  unique index: { user, slot } for PENDING/CONFIRMED,
  timestamps
}
```

## Environment Variables

### Backend
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT signing
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port
- `CLIENT_URL` - Frontend URL for CORS
- `PENDING_EXPIRY_MINUTES` - Minutes before auto-expiring pending bookings

### Frontend
- `VITE_API_URL` - Backend API base URL

## Running the Application

### Terminal 1 - Backend
```bash
cd backend
npm start
```

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

Then open `http://localhost:5173` in your browser.

## Testing

### Create Test Admin Account
1. Register a user with any email/password
2. Manually update the role in MongoDB to "admin", or use the create-admin endpoint

### Test Flow
1. Login as admin
2. Go to admin dashboard
3. Add a doctor
4. Create appointment slots
5. Logout and login as regular user
6. Browse and book appointments

## Error Handling

The application has centralized error handling:
- Duplicate key errors (409)
- Validation errors (400)
- Authentication errors (401)
- Authorization errors (403)
- Not found errors (404)
- Server errors (500)

## Performance Optimizations

- **Doctor List Caching**: 1-minute TTL for unfiltered requests
- **Slot Caching**: 30-second TTL per doctor/date combination
- **MongoDB Indexes**: Compound indexes on frequently queried fields
- **Atomic Operations**: Prevents race conditions in concurrent bookings
- **Rate Limiting**: 100 requests per 15 minutes per IP

## Security Features

- Password hashing with bcryptjs (12 rounds)
- JWT token validation on protected routes
- Role-based access control (RBAC)
- CORS protection
- Helmet.js for security headers
- Rate limiting

## Troubleshooting

### "Cannot find module" errors
- Run `npm install` in both backend and frontend directories
- Check file paths are correct

### API Connection Issues
- Verify VITE_API_URL in frontend .env
- Check backend is running on correct port
- Check CORS is enabled in backend server.js

### MongoDB Connection Issues
- Verify MONGO_URI in backend .env
- Check MongoDB Atlas network access settings
- Ensure database user has correct permissions

### Port Already in Use
Backend: `PORT=3001 npm start`
Frontend: `npm run dev -- --port 5174`

## License

ISC

## Support

For issues or questions, create an issue in the repository.
