import mongoose from "mongoose";
import { seedMongoDefaults } from "./dataStore.js";

let isDbConnected = false;

const connect = async (url) => {
  if (!url) {
    console.log("ℹ️ No MONGODB URI provided; running in local resilient mode.");
    return false;
  }

  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(url, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    isDbConnected = true;
    console.log("==================================================");
    console.log("✅ Successfully connected to MongoDB Database!");
    console.log("📂 Storage: User & Official auth records stored in MongoDB.");
    console.log("==================================================");
    await seedMongoDefaults();
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