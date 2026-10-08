/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect } from 'react';
import api from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserLoggedIn = async () => {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (storedUser && token) {
        try {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
          // Verify and refresh profile from backend
          const res = await api.get('/auth/me');
          if (res.data?.success && res.data?.user) {
            setUser(res.data.user);
            localStorage.setItem('user', JSON.stringify(res.data.user));
          }
        } catch {
          // Token expired or invalid
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          setUser(null);
        }
      }
      setLoading(false);
    };
    checkUserLoggedIn();
  }, []);

  /**
   * Unified Login:
   * Accepts (credentials) or (role, credentials) for backwards compatibility.
   */
  const login = async (roleOrCreds, maybeCreds) => {
    try {
      let credentials = {};
      if (typeof roleOrCreds === 'object' && roleOrCreds !== null) {
        credentials = roleOrCreds;
      } else {
        credentials = maybeCreds || {};
      }

      // Ensure identifier key is set
      const identifier = credentials.identifier || credentials.loginIdentifier || credentials.rollNumber || credentials.teacherId || credentials.headId || credentials.username;
      const payload = {
        identifier,
        password: credentials.password
      };

      const response = await api.post('/auth/login', payload);
      const data = response.data;
      const userData = data.user || data;
      const token = data.token || userData.token;

      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', token);
      setUser(userData);
      return { success: true, user: userData, token };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed. Please check your credentials.'
      };
    }
  };

  /**
   * Role-specific Registration:
   * Supports 'student', 'teacher', and 'department_head'.
   * Admin self-registration is strictly blocked.
   */
  const register = async (role, data) => {
    if (role === 'admin') {
      return {
        success: false,
        message: 'Administrator accounts cannot be registered publicly.'
      };
    }

    try {
      let endpoint = '/auth/register/student';
      if (role === 'teacher') endpoint = '/auth/register/teacher';
      else if (role === 'department_head' || role === 'head') endpoint = '/auth/register/head';

      const response = await api.post(endpoint, data);
      const resData = response.data;
      const userData = resData.user || resData;
      const token = resData.token || userData.token;

      if (token) {
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', token);
        setUser(userData);
      }
      return { success: true, user: userData, token };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed. Please check your inputs.'
      };
    }
  };

  // Department Head Dual-Mode State (Section 6 & 51)
  const [headMode, setHeadMode] = useState(() => {
    return localStorage.getItem('headMode') || 'HEAD';
  });

  const toggleHeadMode = (newMode) => {
    const next = newMode || (headMode === 'HEAD' ? 'TEACHER' : 'HEAD');
    setHeadMode(next);
    localStorage.setItem('headMode', next);
    return next;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      setUser,
      headMode,
      setHeadMode,
      toggleHeadMode
    }}>
      {children}
    </AuthContext.Provider>
  );
};
