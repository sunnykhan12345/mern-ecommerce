import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_DB;

    if (!mongoUri) {
      throw new Error("MONGO_DB is missing from the environment variables.");
    }

    const connection = await mongoose.connect(mongoUri);

    console.log(
      `MongoDB connected successfully: ${connection.connection.host}`,
    );

    console.log(`Database name: ${connection.connection.name}`);

    return connection;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);

    throw error;
  }
};
