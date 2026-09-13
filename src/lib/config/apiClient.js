"use client";
import axios from "axios";

let cachedToken = null;
let authPromise = null;
let authRef = null;

const getAuthInstance = async () => {
  if (authRef) return authRef;
  if (!authPromise) {
    authPromise = (async () => {
      try {
        const { auth } = await import("./firebaseClient");
        authRef = auth;
        const { onAuthStateChanged } = await import("firebase/auth");
        onAuthStateChanged(auth, async (user) => {
          try {
            cachedToken = user ? await user.getIdToken() : null;
          } catch {
            cachedToken = null;
          }
        });
        return auth;
      } catch (err) {
        console.error("[API Client] Failed initializing auth instance:", err);
        return null;
      }
    })();
  }
  return authPromise;
};

if (typeof window !== "undefined") {
  getAuthInstance();
}

export const setCachedToken = (token) => {
  cachedToken = token;
};

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BASE_URL || "",
});

const waitForUser = async () => {
  const auth = await getAuthInstance();
  if (!auth) return null;
  let user = auth.currentUser;
  if (user || cachedToken) return user;
  const started = Date.now();
  while (!user && !cachedToken && Date.now() - started < 2000) {
    await new Promise((r) => setTimeout(r, 100));
    user = auth.currentUser;
  }
  return user;
};

api.interceptors.request.use(async (config) => {
  try {
    if (!config.headers.Authorization) {
      const user = await waitForUser();
      if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
        cachedToken = token;
      } else if (cachedToken) {
        config.headers.Authorization = `Bearer ${cachedToken}`;
      }
    }
  } catch (err) {
    console.warn("[API Client] Error resolving auth token for request:", err);
  }

  console.log(`[API Request] 🚀 ${config.method?.toUpperCase()} ${config.url}`, {
    hasAuthToken: Boolean(config.headers?.Authorization),
  });

  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ✅ ${response.status} ${response.config?.method?.toUpperCase()} ${response.config?.url}`);
    return response;
  },
  (error) => {
    console.error(
      `[API Response Error] ❌ ${error.response?.status || "ERR"} ${error.config?.method?.toUpperCase()} ${error.config?.url}:`,
      error.response?.data || error.message
    );
    return Promise.reject(error);
  }
);

export default api;