import React, { useState } from 'react';
import { useAuth } from '../Data/AuthData'; // Updated import
import API_BASE_URL from '../config';
import { useNavigate } from 'react-router-dom';
import { X, Lock, User, Eye, EyeOff } from 'lucide-react';

export default function LoginPopup({ onClose }: { onClose: () => void }) {
  const { login } = useAuth(); // Using auth context
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to authenticate");

      // Store user data in Auth Context
      login(data.user);

      // Store role and IDs in localStorage
      localStorage.setItem("userRole", data.user.role);
      localStorage.setItem("authId", data.user.auth_id.toString());
      if (data.user.user_id) localStorage.setItem("userId", data.user.user_id.toString());
      if (data.user.client_id) localStorage.setItem("clientId", data.user.client_id.toString());

      let redirectPath = "/";
      switch (data.user.role) {
        case "admin":
          redirectPath = "/admin-dashboard";
          break;
        case "employee":
          redirectPath = "/employee-dashboard";
          break;
        case "client":
          redirectPath = "/client-dashboard";
          break;
        default:
          throw new Error("Unauthorized role");
      }

      onClose();
      navigate(redirectPath);
    } catch (err: any) {
      console.error("Login Error:", err);
      if (err.message === 'Failed to fetch') {
        setError("Network error: Unable to reach the server. Please check your connection or try again later.");
      } else {
        setError(err.message || 'An unknown error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };


  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-4 flex justify-between items-center">
          <div className="flex items-center">
            <Lock className="h-6 w-6 text-white mr-2" />
            <h2 className="text-xl font-semibold text-white">System Login</h2>
          </div>
          <button onClick={onClose} className="text-white hover:text-blue-200 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center">
              <X className="h-5 w-5 mr-2" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter your username"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              onClick={handleLogin}
              disabled={isLoading || !username || !password}
              className={`w-full py-3 px-4 rounded-lg font-medium text-white flex items-center justify-center ${isLoading || !username || !password
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
                } transition-colors`}
            >
              {isLoading ? 'Loging in...' : 'Log In'}
            </button>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600">Use the credentials provided by your administrator</p>
        </div>
      </div>
    </div>
  );
}
