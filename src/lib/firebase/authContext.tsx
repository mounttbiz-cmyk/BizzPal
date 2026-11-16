"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  getAdditionalUserInfo,
} from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from "./config";
import { startServerSession, hasServerSession, endServerSession } from "./serverSession";

export interface GoogleAuthResult {
  user: User;
  isNewUser: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isConfigured: boolean;
  signInWithGoogle: () => Promise<GoogleAuthResult | null>;
  signInWithEmail: (email: string, pass: string) => Promise<User | null>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<User | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isConfigured: false,
  signInWithGoogle: async () => null,
  signInWithEmail: async () => null,
  signUpWithEmail: async () => null,
  logout: async () => {},
});

/** Signs the customer in on the server too. If the server refuses, the Firebase sign-in is undone. */
async function requireServerSession(user: User) {
  const r = await startServerSession(user);
  if (!r.ok) {
    try {
      if (auth) await signOut(auth);
    } catch {}
    const err: any = new Error(r.error || "We could not verify your sign-in.");
    err.code = "auth/server-session-rejected";
    throw err;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        // Make sure the server also knows who this is
        hasServerSession().then(ok => {
          if (!ok) startServerSession(currentUser);
        });
        // Sync to local session for app compatibility
        const session = {
          id: currentUser.uid,
          email: currentUser.email || "",
          name: currentUser.displayName || currentUser.email?.split("@")[0] || "Founder",
          photoURL: currentUser.photoURL || null,
          provider: currentUser.providerData[0]?.providerId || "firebase",
          authenticatedAt: new Date().toISOString(),
        };
        localStorage.setItem("bizzpal_user_session", JSON.stringify(session));
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async (): Promise<GoogleAuthResult | null> => {
    if (!auth || !googleProvider) {
      throw new Error("Firebase Auth is not configured. Please add your Firebase credentials.");
    }
    const result = await signInWithPopup(auth, googleProvider);
    await requireServerSession(result.user);
    const info = getAdditionalUserInfo(result);
    return {
      user: result.user,
      isNewUser: Boolean(info?.isNewUser),
    };
  };

  const signInWithEmail = async (email: string, pass: string): Promise<User | null> => {
    if (!auth) {
      throw new Error("Firebase Auth is not configured. Please add your Firebase credentials.");
    }
    const result = await signInWithEmailAndPassword(auth, email, pass);
    await requireServerSession(result.user);
    return result.user;
  };

  const signUpWithEmail = async (email: string, pass: string, name?: string): Promise<User | null> => {
    if (!auth) {
      throw new Error("Firebase Auth is not configured. Please add your Firebase credentials.");
    }
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    if (name && result.user) {
      await updateProfile(result.user, { displayName: name });
    }
    await requireServerSession(result.user);
    return result.user;
  };

  const logout = async () => {
    await endServerSession();
    if (auth) {
      await signOut(auth);
    }
    localStorage.removeItem("bizzpal_user_session");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isConfigured: isFirebaseConfigured,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
