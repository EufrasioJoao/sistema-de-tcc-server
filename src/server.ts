import express from "express";
import cors from "cors";
import fileUpload from "express-fileupload";
import path from "path";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "./swagger.json";
import morgan from "morgan";
import dotenv from "dotenv";

import "./cronJobs";

import serverRoutes from "./routes";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

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
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(serverRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/", (req, res) => {
  res.send("SERVICE: ARQUIVAR OPERATOR APP");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
