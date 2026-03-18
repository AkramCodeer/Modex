import React, { createContext, useContext, useReducer, useCallback } from "react";
import { doctorsAPI, slotsAPI, bookingsAPI } from "../services/api";

const AppContext = createContext(null);

const initialState = {
  doctors: [],
  doctorsLoading: false,
  doctorsError: null,

  // slots data keyed by "doctorId:date"
  slotsMap: {},
  // loading state keyed by "doctorId:date" — prevents global flicker
  slotsLoadingMap: {},

  myBookings: [],
  myBookingsLoading: false,
};

function appReducer(state, action) {
  switch (action.type) {
    case "SET_DOCTORS":
      return {
        ...state,
        doctors: action.payload,
        doctorsLoading: false,
        doctorsError: null,
      };
    case "SET_DOCTORS_LOADING":
      return { ...state, doctorsLoading: action.payload };
    case "SET_DOCTORS_ERROR":
      return { ...state, doctorsError: action.payload, doctorsLoading: false };

    case "SET_SLOTS_LOADING": {
      const key = `${action.doctorId}:${action.date}`;
      return {
        ...state,
        slotsLoadingMap: { ...state.slotsLoadingMap, [key]: action.payload },
      };
    }

    case "SET_SLOTS": {
      const key = `${action.doctorId}:${action.date}`;
      return {
        ...state,
        slotsMap: { ...state.slotsMap, [key]: action.payload },
        slotsLoadingMap: { ...state.slotsLoadingMap, [key]: false },
      };
    }

    // Optimistic: decrement availableCount immediately after booking
    case "SLOT_BOOKED": {
      const updatedMap = {};
      for (const key in state.slotsMap) {
        updatedMap[key] = state.slotsMap[key].map((s) =>
          s._id === action.slotId
            ? { ...s, availableCount: Math.max(0, s.availableCount - 1) }
            : s
        );
      }
      return { ...state, slotsMap: updatedMap };
    }

    // Restore slot count when a booking is cancelled
    case "SLOT_CANCELLED": {
      const updatedMap = {};
      for (const key in state.slotsMap) {
        updatedMap[key] = state.slotsMap[key].map((s) =>
          s._id === action.slotId
            ? { ...s, availableCount: s.availableCount + 1 }
            : s
        );
      }
      return { ...state, slotsMap: updatedMap };
    }

    case "SET_MY_BOOKINGS":
      return {
        ...state,
        myBookings: action.payload,
        myBookingsLoading: false,
      };
    case "SET_MY_BOOKINGS_LOADING":
      return { ...state, myBookingsLoading: action.payload };

    case "CANCEL_BOOKING":
      return {
        ...state,
        myBookings: state.myBookings.map((b) =>
          b._id === action.bookingId ? { ...b, status: "CANCELLED" } : b
        ),
      };

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // ── Doctors ─────────────────────────────────────────────────────────
  const fetchDoctors = useCallback(async (params) => {
    dispatch({ type: "SET_DOCTORS_LOADING", payload: true });
    try {
      const res = await doctorsAPI.getAll(params);
      dispatch({ type: "SET_DOCTORS", payload: res.data.doctors });
    } catch (err) {
      dispatch({ type: "SET_DOCTORS_ERROR", payload: err.message });
    }
  }, []);

  // ── Slots ─────────────────────────────────────────────────────────────
  const fetchSlots = useCallback(async (doctorId, date) => {
    if (!doctorId || !date) return;
    const key = `${doctorId}:${date}`;

    // Don't re-fetch if already loaded (cache hit)
    // But always re-fetch if explicitly called (e.g. after a failed booking)
    dispatch({ type: "SET_SLOTS_LOADING", doctorId, date, payload: true });

    try {
      const res = await slotsAPI.getByDoctorAndDate(doctorId, date);
      dispatch({
        type: "SET_SLOTS",
        doctorId,
        date,
        payload: res.data.slots,
      });
    } catch {
      dispatch({ type: "SET_SLOTS_LOADING", doctorId, date, payload: false });
    }
  }, []);

  // Get slots from cache for a doctor+date
  const getSlots = useCallback(
    (doctorId, date) => {
      const key = `${doctorId}:${date}`;
      return state.slotsMap[key] ?? null;
    },
    [state.slotsMap]
  );

  // Check if slots are loading for a specific doctor+date
  const isSlotsLoading = useCallback(
    (doctorId, date) => {
      const key = `${doctorId}:${date}`;
      return state.slotsLoadingMap[key] ?? false;
    },
    [state.slotsLoadingMap]
  );

  // ── Bookings ──────────────────────────────────────────────────────────
  const fetchMyBookings = useCallback(async (params) => {
    dispatch({ type: "SET_MY_BOOKINGS_LOADING", payload: true });
    try {
      const res = await bookingsAPI.getMyBookings(params);
      dispatch({ type: "SET_MY_BOOKINGS", payload: res.data.bookings });
    } catch {
      dispatch({ type: "SET_MY_BOOKINGS_LOADING", payload: false });
    }
  }, []);

  const cancelBooking = useCallback(async (bookingId, slotId) => {
    await bookingsAPI.cancel(bookingId);
    dispatch({ type: "CANCEL_BOOKING", bookingId });
    // Restore slot availability optimistically
    if (slotId) {
      dispatch({ type: "SLOT_CANCELLED", slotId });
    }
  }, []);

  const notifySlotBooked = useCallback((slotId) => {
    dispatch({ type: "SLOT_BOOKED", slotId });
  }, []);

  return (
    <AppContext.Provider
      value={{
        ...state,
        fetchDoctors,
        fetchSlots,
        getSlots,
        isSlotsLoading,
        fetchMyBookings,
        cancelBooking,
        notifySlotBooked,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
};