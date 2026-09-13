"use client";

import { useEffect, useRef, useState } from "react";
import { Provider, useDispatch } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { Toaster, toast } from "react-hot-toast";
import { makeStore } from "@/lib/store/store";
import { setUser, setLoading, logout } from "@/lib/store/features/authSlice";
import { setCachedToken } from "@/lib/config/apiClient";
import api from "@/lib/config/apiClient";
import Loader from "@/components/Loader";

function AuthListener({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const { auth } = await import("@/lib/config/firebaseClient");
        const { onAuthStateChanged } = await import("firebase/auth");

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          console.log("[AuthListener] onAuthStateChanged triggered:", firebaseUser ? `UID: ${firebaseUser.uid} (${firebaseUser.email})` : "No active session");
          if (firebaseUser) {
            try {
              const idToken = await firebaseUser.getIdToken();
              setCachedToken(idToken);
              console.log("[AuthListener] Synchronizing user with /api/users/sync...");
              const { data } = await api.post(
                "/api/users/sync",
                {
                  name: firebaseUser.displayName || firebaseUser.email?.split("@")[0],
                  email: firebaseUser.email,
                  photoURL: firebaseUser.photoURL,
                  emailVerified: firebaseUser.emailVerified,
                },
                { headers: { Authorization: `Bearer ${idToken}` } }
              );
              console.log("[AuthListener] User sync complete:", data.user);
              if (!cancelled) dispatch(setUser(data.user));
            } catch (err: any) {
              console.error("[AuthListener] User sync failed:", err?.response?.data || err.message);
              if (!cancelled) dispatch(setLoading(false));
              if (err?.response?.status === 403) {
                toast.error(err.response.data?.message || "Please verify your email before signing in.");
              }
            }
          } else {
            if (!cancelled) dispatch(logout());
          }
          if (!cancelled) setAuthReady(true);
        });

        return () => { cancelled = true; unsubscribe(); };
      } catch (err) {
        console.error("[AuthListener] Initialization error:", err);
        if (!cancelled) {
          dispatch(setLoading(false));
          setAuthReady(true);
        }
      }
    };

    const cleanup = init();
    return () => { cleanup.then?.((fn) => fn?.()); cancelled = true; };
  }, [dispatch]);

  if (!authReady) return <Loader />;

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<ReturnType<typeof makeStore> | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  return (
    <Provider store={storeRef.current.store}>
      <PersistGate loading={null} persistor={storeRef.current.persistor}>
        <AuthListener>
          {children}
          <Toaster position="top-right" />
        </AuthListener>
      </PersistGate>
    </Provider>
  );
}
