import mongoose from "mongoose";

let isDbConnected = false;

const connect = async (url) => {
  if (!url) {
    console.log("ℹ️ No MONGODB URI provided; running in local resilient mode.");
    return false;
  }

  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(url, {
      serverSelectionTimeoutMS: 2500, // Do not hang if cluster unreachable
      connectTimeoutMS: 2500
    });
    isDbConnected = true;
    console.log("✅ Successfully connected to MongoDB Database!");
    return true;
  } catch (e) {
    isDbConnected = false;
    console.warn("⚠️ MongoDB offline or cluster unreachable:", e.message);
    console.log("🛡️ NetGenX local resilient storage engine activated for User & Official accounts.");
    return false;
  }
};

export const getDbStatus = () => isDbConnected;
export default connect;