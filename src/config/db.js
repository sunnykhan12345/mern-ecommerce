import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_DB);

    console.log("MongoDB connected successfully 🚀");
  } catch (err) {
    console.error("DB connection failed ❌", err);
    process.exit(1); // stop server if DB fails
  }
};
