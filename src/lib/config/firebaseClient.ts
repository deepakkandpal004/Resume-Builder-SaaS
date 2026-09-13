"use client";

import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDrVpSR__ihIgJiy6FB7H9o4SPq0s2TbdU",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "resume-builder-saas-ec55a.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "resume-builder-saas-ec55a",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "resume-builder-saas-ec55a.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "140325645403",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:140325645403:web:6fc9c987f9384eeba7237e",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

if (typeof window !== "undefined") {
  import("firebase/auth").then(({ browserLocalPersistence, setPersistence }) => {
    setPersistence(auth, browserLocalPersistence).catch(() => {});
  });
}

export { auth };
export const googleProvider = new GoogleAuthProvider();
export default app;
