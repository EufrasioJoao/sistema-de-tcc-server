import express from "express";
import cors from "cors";
import fileUpload from "express-fileupload";
import path from "path";
import morgan from "morgan";
import dotenv from "dotenv";
import env from "./config/env";
import serverRoutes from "./routes";

// Load environment variables
dotenv.config();

const app = express();
const PORT = env.PORT;

app.use("/.well-known", express.static(path.join(__dirname, ".well-known")));

// CORS Configuration
const corsOptions = {
  origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Origin",
    "Accept",
    "X-Requested-With",
  ],
};

// Middleware
app.use(cors(corsOptions));
app.use(morgan("dev"));
app.use(express.json({ limit: "100mb" }));
app.use(fileUpload());
app.use(serverRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/", (req, res) => {
  res.send("Rest API do Sistema de Gestão de TCCs");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
