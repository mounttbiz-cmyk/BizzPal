import { db as firestoreDb, isFirebaseConfigured } from "./config";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

/**
 * Universal Firestore persistence bridge for Vercel / serverless runtime.
 * Allows storing platform config, tenant state, and user business records
 * in Firebase Firestore so data persists indefinitely across serverless cold starts.
 */

const PLATFORM_COLLECTION = "platform_settings";
const USER_PROFILES_COLLECTION = "user_profiles";
const BUSINESS_COLLECTION = "business_tenants";

export async function getFirestoreConfig<T>(key: string, fallback: T): Promise<T> {
  if (!firestoreDb || !isFirebaseConfigured) return fallback;
  try {
    const docRef = doc(firestoreDb, PLATFORM_COLLECTION, key);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return (data.value as T) ?? fallback;
    }
  } catch (err) {
    console.warn(`[Firestore] Failed to read ${key}:`, err);
  }
  return fallback;
}

export async function setFirestoreConfig<T>(key: string, value: T): Promise<boolean> {
  if (!firestoreDb || !isFirebaseConfigured) return false;
  try {
    const docRef = doc(firestoreDb, PLATFORM_COLLECTION, key);
    // Explicit replacement (no merge: true) to guarantee deleted array elements/keys are purged from GCP Firestore
    await setDoc(docRef, {
      value,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.warn(`[Firestore] Failed to write ${key}:`, err);
    return false;
  }
}

export async function deleteFirestoreConfig(key: string): Promise<boolean> {
  if (!firestoreDb || !isFirebaseConfigured) return false;
  try {
    const docRef = doc(firestoreDb, PLATFORM_COLLECTION, key);
    await setDoc(docRef, {
      value: null,
      deletedAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.warn(`[Firestore] Failed to delete ${key}:`, err);
    return false;
  }
}

export async function getFirestoreUserProfile(email: string): Promise<any | null> {
  if (!firestoreDb || !isFirebaseConfigured || !email) return null;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const docRef = doc(firestoreDb, USER_PROFILES_COLLECTION, cleanEmail);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    console.warn(`[Firestore] Failed to get user ${email}:`, err);
  }
  return null;
}

export async function saveFirestoreUserProfile(email: string, profile: any): Promise<boolean> {
  if (!firestoreDb || !isFirebaseConfigured || !email) return false;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const docRef = doc(firestoreDb, USER_PROFILES_COLLECTION, cleanEmail);
    await setDoc(docRef, {
      ...profile,
      email: cleanEmail,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn(`[Firestore] Failed to save profile for ${email}:`, err);
    return false;
  }
}

export async function saveFirestoreBusinessRecord(bizId: string, data: any): Promise<boolean> {
  if (!firestoreDb || !isFirebaseConfigured || !bizId) return false;
  try {
    const docRef = doc(firestoreDb, BUSINESS_COLLECTION, bizId);
    await setDoc(docRef, {
      ...data,
      id: bizId,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn(`[Firestore] Failed to save business ${bizId}:`, err);
    return false;
  }
}
