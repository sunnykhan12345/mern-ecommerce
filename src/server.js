import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./config/db.js";
import userRouter from "./routes/userRoute.js";
// import userRouter from "./routes/userRoute.js";

dotenv.config();
// connect database
connectDB();
const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", userRouter);

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("API Connected Successfully ");
});

// define api routes

// app.use("/api/user", userRouter);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
