import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import fs from "fs";
import path from "path";

let adminApp: App | undefined;
let authInstance: ReturnType<typeof getAuth> | undefined;

function loadServiceAccount(): any {
  // 1. Check FIREBASE_SERVICE_ACCOUNT env var
  let envVal = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (envVal) {
    // Strip surrounding quotes if present (e.g. from Vercel env copy-paste)
    if (
      (envVal.startsWith('"') && envVal.endsWith('"')) ||
      (envVal.startsWith("'") && envVal.endsWith("'"))
    ) {
      envVal = envVal.slice(1, -1).trim();
    }

    // Try parsing directly as JSON string
    if (envVal.startsWith("{")) {
      try {
        const parsed = JSON.parse(envVal);
        if (parsed.private_key) {
          parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
        }
        console.log("[Firebase Admin] Loaded service account credentials from FIREBASE_SERVICE_ACCOUNT env JSON.");
        return parsed;
      } catch (err: any) {
        console.error("[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT direct JSON:", err.message);
      }
    }

    // Try Base64 decoding if it's encoded
    try {
      const decoded = Buffer.from(envVal, "base64").toString("utf-8").trim();
      if (decoded.startsWith("{")) {
        const parsed = JSON.parse(decoded);
        if (parsed.private_key) {
          parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
        }
        console.log("[Firebase Admin] Loaded service account credentials from base64 encoded FIREBASE_SERVICE_ACCOUNT.");
        return parsed;
      }
    } catch {
      // Not base64, continue
    }

    // Check if it's a file path
    const resolvedPath = path.isAbsolute(envVal) ? envVal : path.join(/*turbopackIgnore: true*/ process.cwd(), envVal);
    if (fs.existsSync(resolvedPath)) {
      try {
        const fileContent = fs.readFileSync(resolvedPath, "utf-8");
        const parsed = JSON.parse(fileContent);
        if (parsed.private_key) {
          parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
        }
        console.log("[Firebase Admin] Loaded service account credentials from file:", resolvedPath);
        return parsed;
      } catch (err: any) {
        console.error("[Firebase Admin] Failed reading service account file at path:", resolvedPath, err.message);
      }
    }
  }

  // 2. Fallback to known local service account file names in project root
  const fallbackFiles = [
    "resume-builder-saas-ec55a-firebase-adminsdk-fbsvc-df3e67b965.json",
    "serviceAccountKey.json",
    "firebase-service-account.json",
  ];

  for (const fileName of fallbackFiles) {
    const filePath = path.join(/*turbopackIgnore: true*/ process.cwd(), fileName);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(content);
        if (parsed.private_key) {
          parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
        }
        console.log("[Firebase Admin] Successfully auto-loaded service account from fallback file:", fileName);
        return parsed;
      } catch (err: any) {
        console.error(`[Firebase Admin] Failed reading fallback file ${fileName}:`, err.message);
      }
    }
  }

  // 3. Check individual env variables
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    privateKey = privateKey.trim();
    if (
      (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
      (privateKey.startsWith("'") && privateKey.endsWith("'"))
    ) {
      privateKey = privateKey.slice(1, -1);
    }
    privateKey = privateKey.replace(/\\n/g, "\n");

    console.log("[Firebase Admin] Loaded service account from individual environment variables.");
    return {
      projectId,
      clientEmail,
      privateKey,
    };
  }

  throw new Error(
    "[Firebase Admin] Missing Firebase Admin credentials. Please provide FIREBASE_SERVICE_ACCOUNT JSON or set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY."
  );
}

function getAdminApp(): App {
  if (adminApp) return adminApp;

  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }

  console.log("[Firebase Admin] Initializing Firebase Admin App...");
  const serviceAccount = loadServiceAccount();

  adminApp = initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id || serviceAccount.projectId,
  });

  console.log("[Firebase Admin] Initialized Firebase Admin App:", adminApp.name);
  return adminApp;
}

export function getFirebaseAuth() {
  if (!authInstance) {
    authInstance = getAuth(getAdminApp());
  }
  return authInstance;
}

export const verifyIdToken = async (token: string) => {
  try {
    const auth = getFirebaseAuth();
    const decoded = await auth.verifyIdToken(token);
    console.log("[Firebase Admin] Token successfully verified for UID:", decoded.uid, "Email:", decoded.email);
    return decoded;
  } catch (error: any) {
    console.error("[Firebase Admin] Token verification failed:", error.message);
    throw error;
  }
};

export default getAdminApp;
