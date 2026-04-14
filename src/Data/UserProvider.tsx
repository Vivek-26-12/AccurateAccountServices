import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import axios from 'axios';
import API_BASE_URL from '../config';
import CryptoJS from 'crypto-js';

const SECRET_KEY = "final-year-project-secure-key-2025";

const encryptData = (data: any) => {
  return CryptoJS.AES.encrypt(JSON.stringify(data), SECRET_KEY).toString();
};

const decryptData = (ciphertext: string) => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    return decryptedData ? JSON.parse(decryptedData) : null;
  } catch (e) {
    try {
      return JSON.parse(ciphertext);
    } catch {
      return null;
    }
  }
};

type AuthUser = {
  auth_id: number;
  username: string;
  role: "admin" | "employee" | "client";
  created_at?: string;
  updated_at?: string;
};

// Represents a User (admin/employee)
type AppUser = {
  user_id: number;
  auth_id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: "admin" | "employee" | "client";
  created_at: string;
  updated_at: string;
  profile_pic: string | null;
  phone?: string;
};

// Represents a Client profile
type ProfileData = {
  auth_id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  company_name?: string;
  contact_person?: string;
  gstin?: string;
  pan_number?: string;
  created_at?: string;
  updated_at?: string;
  profile_pic?: string | null;
  role?: string;
  user_id?: number | string;
};

type UserContextType = {
  user: AuthUser | null;                 // Used for base auth info (from login)
  currentUser: AppUser | null;           // Maps to UserData (full details for employees/admins)
  profile: ProfileData | null;           // Maps to ProfileData (full details for clients)
  users: AppUser[];                      // List of all employees/admins
  login: (userData: AuthUser) => void;
  logout: () => void;
  fetchUsers: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  fetchUserData: () => void;             // Backwards compatibility alias
  loading: boolean;
  error: string | null;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Initialize Auth State
  useEffect(() => {
    const initAuth = () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const userData = decryptData(storedUser);
        if (userData) {
          setUser(userData);
          if (storedUser.startsWith('{')) {
            localStorage.setItem("user", encryptData(userData));
          }
        } else {
          localStorage.removeItem("user");
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  // 2. Fetch Full Details when Auth User Changes
  useEffect(() => {
    if (!user) {
      setCurrentUser(null);
      setProfile(null);
      setUsers([]);
      return;
    }

    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Shared endpoint to fetch appropriate role data
        const isClient = user.role === 'client';
        if (isClient) {
          const profileRes = await axios.get(`${API_BASE_URL}/clients/${user.auth_id}`);
          setProfile(profileRes.data);
          
          // Fallback map profile to currentUser to satisfy UserData dependencies
          setCurrentUser({
            user_id: profileRes.data.client_id || 0,
            auth_id: user.auth_id,
            first_name: profileRes.data.contact_person?.split(' ')[0] || '',
            last_name: profileRes.data.contact_person?.split(' ')[1] || '',
            email: profileRes.data.email || '',
            role: 'client',
            created_at: profileRes.data.created_at || new Date().toISOString(),
            updated_at: profileRes.data.updated_at || new Date().toISOString(),
            profile_pic: profileRes.data.profile_pic || null
          });
        } else {
          const userRes = await axios.get(`${API_BASE_URL}/users/auth/${user.auth_id}`);
          setCurrentUser(userRes.data);
          setProfile(userRes.data);
          
          const listRes = await axios.get(`${API_BASE_URL}/users`);
          const usersData = Array.isArray(listRes.data) ? listRes.data : [];
          setUsers(usersData.filter((u: AppUser) => u.auth_id !== user.auth_id));
        }
      } catch (err: any) {
        console.error("Failed to fetch full user details", err);
        setError("Failed to load user details");
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [user]);

  const login = (userData: AuthUser) => {
    setUser(userData);
    localStorage.setItem("user", encryptData(userData));
  };

  const logout = () => {
    setUser(null);
    setCurrentUser(null);
    setProfile(null);
    localStorage.removeItem("user");
  };

  const fetchUsers = async () => {
    if (user?.role === 'client') return;
    try {
      const response = await axios.get(`${API_BASE_URL}/users`);
      const usersData = response.data;
      const otherUsers = usersData.filter((u: AppUser) => u.auth_id !== user?.auth_id);
      setUsers(otherUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchCurrentUser = async () => {
    // Already handled centrally, but kept for compatibility
  };
  
  const fetchUserData = async () => {
    // Alias for compatibility
  };

  return (
    <UserContext.Provider value={{
      user, currentUser, profile, users,
      login, logout, fetchUsers, fetchCurrentUser, fetchUserData,
      loading, error
    }}>
      {children}
    </UserContext.Provider>
  );
};

// Aliased Hooks for compatibility across the codebase without changing hundreds of imports
export const useAuth = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error("useAuth must be used within a UserProvider");
  return context;
};

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUserContext must be used within a UserProvider");
  return context;
};

export const useProfile = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error("useProfile must be used within a UserProvider");
  return context;
};
