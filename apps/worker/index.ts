import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import webhookRoutes from "./routes/webhook";
dotenv.config();
const app = express();


app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 8000;

app.get("/", (req, res) => {
  res.send("Webhook Service Running!");
});

app.use(webhookRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});