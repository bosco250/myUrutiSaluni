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
  updateUser: (profileData: Partial<User>) => Promise<User>;
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

      // Load token and user data from AsyncStorage in parallel for faster startup
      const [savedToken, savedUser] = await Promise.all([
        authService.getToken(),
        authService.getUser(),
      ]);

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(savedUser);
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

      setToken(response.access_token);
      setUser(response.user);

      return response;
    } catch (error) {
      throw error;
    }
  };

  const register = async (
    credentials: RegisterCredentials
  ): Promise<LoginResponse> => {
    try {
      const response = await authService.register(credentials);

      setToken(response.access_token);
      setUser(response.user);

      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();

      setToken(null);
      setUser(null);
    } catch (error) {
      console.error("Error during logout:", error);
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

  /**
   * Update user profile and immediately reflect changes in context
   */
  const updateUser = async (profileData: Partial<User>): Promise<User> => {
    if (!user?.id) {
      throw new Error("No user logged in");
    }

    try {
      // Call API to update profile
      const updatedUser = await authService.updateProfile(user.id, profileData);
      
      // Immediately update local state so UI reflects changes
      setUser(updatedUser);
      
      return updatedUser;
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
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
    updateUser,
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
