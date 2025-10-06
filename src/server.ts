import express from "express";
import cors from "cors";
import fileUpload from "express-fileupload";
import path from "path";
import morgan from "morgan";
import dotenv from "dotenv";
import env from "./config/env";
import serverRoutes from "./routes";
import { setupSwagger } from "./config/swagger";

// Load environment variables
dotenv.config();

const app = express();
const PORT = env.PORT;


import "./cronJobs";

app.use("/.well-known", express.static(path.join(__dirname, ".well-known")));

// CORS Configuration
const corsOptions = {
  origin: "*",
  credentials: false,
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

// Setup Swagger documentation
setupSwagger(app);

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/", (req, res) => {
  res.send(`
    <h1>Sistema de Gestão de TCCs - API</h1>
    <p>API REST para gestão de Trabalhos de Conclusão de Curso</p>
    <ul>
      <li><a href="/api-docs">📚 Documentação da API (Swagger)</a></li>
      <li><a href="/api/health">🔍 Status da API</a></li>
    </ul>
  `);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
