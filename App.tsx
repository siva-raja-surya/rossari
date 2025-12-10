import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  Outlet,
} from "react-router-dom";
import LoginPage from "./components/LoginPage";
import DashboardPage from "./components/DashboardPage";
import PaymentForm from "./components/PaymentForm";
import UploadAdvise from "./components/UploadAdvise";
import { User } from "./types";

// Layout component for authenticated pages
const ProtectedLayout: React.FC<{
  user: User | null;
  onLogout: () => void;
}> = ({ user, onLogout }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      <header className="bg-white shadow-md">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-bold text-xl ml-2">AR AI Assistant</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600 hidden sm:inline">
                Welcome, {user.email}
              </span>
              <button
                onClick={onLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Logout
              </button>
            </div>
          </div>
        </nav>
      </header>
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
};

const App: React.FC = () => {
  // Use lazy initialization to read from localStorage immediately on mount
  const [user, setUser] = useState<User | null>(() => {
    const storedEmail = localStorage.getItem("userEmail");
    return storedEmail ? { email: storedEmail } : null;
  });

  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const authCheckRef = useRef(false);

  // Validate token on mount
  useEffect(() => {
    if (authCheckRef.current) return;
    authCheckRef.current = true;

    const validateSession = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/auth/validate", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error("Token invalid or expired");
        }

        // Token is valid
        setIsLoading(false);
      } catch (err) {
        console.error("Session expired:", err);
        handleLogout();
        setIsLoading(false);
      }
    };

    validateSession();
  }, []);

  const handleLogin = (user: User, token: string) => {
    localStorage.setItem("token", token);
    localStorage.setItem("userEmail", user.email);
    setUser(user);
    // Navigation to home is handled by the Route conditional rendering or navigate('/')
    navigate("/");
  };

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    setUser(null);
    navigate("/login");
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <svg
            className="animate-spin h-10 w-10 text-blue-600 mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="text-gray-500 font-medium">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          !user ? (
            <LoginPage onLogin={handleLogin} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      <Route element={<ProtectedLayout user={user} onLogout={handleLogout} />}>
        <Route
          path="/"
          element={<DashboardPage user={user!} onLogout={handleLogout} />}
        />
        <Route path="/form" element={<PaymentForm />} />
        <Route path="/upload" element={<UploadAdvise />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
