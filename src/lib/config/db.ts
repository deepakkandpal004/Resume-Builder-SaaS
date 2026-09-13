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
    console.log("[MongoDB] Connecting to database 'resume-builder'...");
    cached.promise = mongoose.connect(MONGODB_URI, {
      dbName: "resume-builder",
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    }).then((m) => {
      console.log(`[MongoDB] Connected successfully! Host: ${m.connection.host}, Database: ${m.connection.name}`);
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e: any) {
    console.error("[MongoDB] Connection error:", e.message);
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
