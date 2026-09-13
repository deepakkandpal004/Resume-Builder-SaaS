import mongoose from "mongoose";

let cached: any = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error("[MongoDB] MONGODB_URI is not defined in environment variables");
  }

  if (!cached.promise) {
    console.log("[MongoDB] Connecting to MongoDB...");
    cached.promise = mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    }).then((m) => {
      console.log("========== MONGODB DEBUG ==========");
      console.log("Host:", m.connection.host);
      console.log("Database:", m.connection.name);
      console.log("DB databaseName:", m.connection.db?.databaseName);
      console.log("===================================");

      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[MongoDB] Connection error:", message);
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
