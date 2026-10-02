import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { hashPassword, verifyPassword, generateUUID } from '@/utils/crypto';
import { SyncService } from '@/lib/sync/syncService';
import type { User } from '@/types';

interface AuthContextType {
  currentUser: User | null;
  activeAssociate: User | null;
  allAssociates: User[];
  isOwner: boolean;
  hasUnlockedCrossEdit: boolean;
  temporaryUnlockExpiresAt: number | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchWorkspace: (associateId: string) => void;
  verifyAndUnlockCrossEdit: (password: string) => Promise<{ success: boolean; error?: string }>;
  lockCrossEdit: () => void;
  updateProfile: (newUsername?: string, newPassword?: string) => Promise<{ success: boolean; error?: string }>;
  refreshAssociates: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeAssociate, setActiveAssociate] = useState<User | null>(null);
  const [allAssociates, setAllAssociates] = useState<User[]>([]);
  const [hasUnlockedCrossEdit, setHasUnlockedCrossEdit] = useState<boolean>(false);
  const [temporaryUnlockExpiresAt, setTemporaryUnlockExpiresAt] = useState<number | null>(null);

  const refreshAssociates = async () => {
    const users = await db.users.toArray();
    setAllAssociates(users);

    // Keep active and current user up to date if they exist
    if (currentUser) {
      const updatedCurrent = users.find(u => u.id === currentUser.id);
      if (updatedCurrent) setCurrentUser(updatedCurrent);
    }
    if (activeAssociate) {
      const updatedActive = users.find(u => u.id === activeAssociate.id);
      if (updatedActive) setActiveAssociate(updatedActive);
    }
  };

  useEffect(() => {
    // Initialize auth
    const initAuth = async () => {
      const users = await db.users.toArray();
      setAllAssociates(users);

      const sessionUserId = sessionStorage.getItem('session_user_id');
      const foundUser = sessionUserId ? users.find(u => u.id === sessionUserId) : null;

      if (foundUser) {
        setCurrentUser(foundUser);
        setActiveAssociate(foundUser);
      }
    };

    initAuth();
  }, []);

  // Check temporary unlock expiration
  useEffect(() => {
    if (!hasUnlockedCrossEdit || !temporaryUnlockExpiresAt) return;

    const interval = setInterval(() => {
      if (Date.now() > temporaryUnlockExpiresAt) {
        setHasUnlockedCrossEdit(false);
        setTemporaryUnlockExpiresAt(null);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [hasUnlockedCrossEdit, temporaryUnlockExpiresAt]);

  const login = async (username: string, password: string) => {
    const cleanUsername = username.trim().toUpperCase();
    const user = await db.users.where('username').equalsIgnoreCase(cleanUsername).first();

    if (!user) {
      return { success: false, error: 'Associé introuvable' };
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return { success: false, error: 'Mot de passe incorrect' };
    }

    setCurrentUser(user);
    setActiveAssociate(user);
    setHasUnlockedCrossEdit(false);
    setTemporaryUnlockExpiresAt(null);
    sessionStorage.setItem('session_user_id', user.id);
    localStorage.setItem('last_username', user.username);

    return { success: true };
  };

  const register = async (username: string, password: string) => {
    const cleanUsername = username.trim().toUpperCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      return { success: false, error: 'Le pseudo doit comporter au moins 3 caractères' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Le mot de passe doit comporter au moins 6 caractères' };
    }

    const existing = await db.users.where('username').equalsIgnoreCase(cleanUsername).first();
    if (existing) {
      return { success: false, error: 'Cet associé existe déjà' };
    }

    const hashedPassword = await hashPassword(password);
    const newUser: User = {
      id: generateUUID(),
      username: cleanUsername,
      password_hash: hashedPassword,
      role: 'associate',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.users.add(newUser);

    // Create user settings
    const newSettings = {
      id: generateUUID(),
      user_id: newUser.id,
      theme: 'dark' as const,
      table_preferences: {},
      updated_at: new Date().toISOString(),
    };
    await db.user_settings.add(newSettings);

    // Push to cloud
    SyncService.pushUser(newUser).catch(console.error);
    SyncService.pushUserSettings(newSettings).catch(console.error);

    await refreshAssociates();
    setCurrentUser(newUser);
    setActiveAssociate(newUser);
    sessionStorage.setItem('session_user_id', newUser.id);
    localStorage.setItem('last_username', newUser.username);

    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
    setActiveAssociate(null);
    setHasUnlockedCrossEdit(false);
    sessionStorage.removeItem('session_user_id');
  };

  const switchWorkspace = (associateId: string) => {
    const target = allAssociates.find(u => u.id === associateId);
    if (target) {
      setActiveAssociate(target);
      // Reset cross edit unlock when switching workspace
      setHasUnlockedCrossEdit(false);
      setTemporaryUnlockExpiresAt(null);
    }
  };

  const verifyAndUnlockCrossEdit = async (password: string) => {
    if (!activeAssociate) return { success: false, error: 'Aucun espace sélectionné' };

    const isValid = await verifyPassword(password, activeAssociate.password_hash);
    if (!isValid) {
      return { success: false, error: 'Mot de passe incorrect' };
    }

    // Grant 15 minutes of edit privilege
    setHasUnlockedCrossEdit(true);
    setTemporaryUnlockExpiresAt(Date.now() + 15 * 60 * 1000);
    return { success: true };
  };

  const lockCrossEdit = () => {
    setHasUnlockedCrossEdit(false);
    setTemporaryUnlockExpiresAt(null);
  };

  const updateProfile = async (newUsername?: string, newPassword?: string) => {
    if (!currentUser) return { success: false, error: 'Non connecté' };

    const updates: Partial<User> = {
      updated_at: new Date().toISOString(),
    };

    if (newUsername && newUsername.trim()) {
      const clean = newUsername.trim().toUpperCase();
      const existing = await db.users.where('username').equalsIgnoreCase(clean).first();
      if (existing && existing.id !== currentUser.id) {
        return { success: false, error: 'Ce pseudo est déjà pris' };
      }
      updates.username = clean;
    }

    if (newPassword && newPassword.length >= 6) {
      updates.password_hash = await hashPassword(newPassword);
    }

    await db.users.update(currentUser.id, updates);

    // Push updated user to cloud
    const updatedUser = await db.users.get(currentUser.id);
    if (updatedUser) {
      SyncService.pushUser(updatedUser).catch(console.error);
    }

    await refreshAssociates();
    return { success: true };
  };

  const isOwner = currentUser?.id === activeAssociate?.id;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        activeAssociate,
        allAssociates,
        isOwner,
        hasUnlockedCrossEdit,
        temporaryUnlockExpiresAt,
        login,
        register,
        logout,
        switchWorkspace,
        verifyAndUnlockCrossEdit,
        lockCrossEdit,
        updateProfile,
        refreshAssociates,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
