import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  authService,
  User,
  LoginResponse,
  RegisterCredentials,
} from "../services/auth";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResponse>;
  register: (credentials: RegisterCredentials) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from storage on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);

      // Load token and user data from AsyncStorage
      // This restores the session when app restarts
      const savedToken = await authService.getToken();
      const savedUser = await authService.getUser();

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(savedUser);
        console.log("AuthContext: Restored session from storage", {
          userId: savedUser.id,
          email: savedUser.email,
          role: savedUser.role,
        });
      } else {
        console.log("AuthContext: No saved session found");
      }
    } catch (error) {
      console.error("Error initializing auth:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (
    email: string,
    password: string
  ): Promise<LoginResponse> => {
    try {
      const response = await authService.login({ email, password });

      // Update state with token and all user data (id, email, phone, fullName, role)
      setToken(response.access_token);
      setUser(response.user);

      console.log("AuthContext: User logged in successfully", {
        userId: response.user.id,
        email: response.user.email,
        role: response.user.role,
      });

      return response;
    } catch (error) {
      // Re-throw error so calling component can handle it
      throw error;
    }
  };

  const register = async (
    credentials: RegisterCredentials
  ): Promise<LoginResponse> => {
    try {
      const response = await authService.register(credentials);

      // Update state with token and all user data (id, email, phone, fullName, role)
      setToken(response.access_token);
      setUser(response.user);

      console.log("AuthContext: User registered successfully", {
        userId: response.user.id,
        email: response.user.email,
        role: response.user.role,
      });

      return response;
    } catch (error) {
      // Re-throw error so calling component can handle it
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();

      // Clear state
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error("Error during logout:", error);
      // Even if logout fails, clear local state
      setToken(null);
      setUser(null);
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const updatedUser = await authService.getUser();
      if (updatedUser) {
        setUser(updatedUser);
      }
    } catch (error) {
      console.error("Error refreshing user:", error);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
