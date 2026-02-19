/** App Server */
// Import npm modules
import express, { Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";

// Import helpers
import logger from "./helpers/logger";
import { validateEnvironmentVariables } from "./utils/envValidator";

// Import routes
import authRoutes from "./routes/auth.route";
import employeeRoutes from "./routes/employee.route";
import postRoutes from "./routes/post.route";
import rankRoutes from "./routes/rank.route";
import postRankLinkRoutes from "./routes/postRankLink.route";
import empPostRankLinkRoutes from "./routes/empPostRankLink.route";
import attendanceRoutes from "./routes/atttendance.route";
import taxesAndDeductionRoutes from "./routes/taxesAndDeduction.route";
import taxDeductionPostRankLinkRoutes from "./routes/taxDeducPostRankLink.route";
import payrollRoutes from "./routes/payroll.route";
import reportRoutes from "./routes/report.route";
import fileUploadRoutes from "./routes/fileUploader.route";

// Import configs
import { PORT } from "./configs/server.config";
// import uploadDocuments from "./middlewares/fileUploader";
import { db } from "./configs/db.config";

// Rate Limiter Middleware: Limit repeated requests to public APIs and/or endpoints
const limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});

// Validate environment variables
validateEnvironmentVariables();
// Check database connection
(async () => {
  try {
    await db.$connect();
    logger.info("Database connected successfully!");
  } catch (error) {
    logger.error("Error connecting to database:", error);
    process.exit(1);
  }
})();
// Create express app
const app = express();

// Set various HTTP headers to help protect your app
app.use(helmet());

// Enable CORS & Allow requests
app.use(cors({ origin: "*", credentials: true }));
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://www.omegapaytrack.com",
      "https://omegapaytrack.com",
    ],
    credentials: true,
  }),
);

// Body Parser Middleware
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));

// Rate Limiter
// app.use(limiter);

// Plug routes
authRoutes(app);
employeeRoutes(app);
postRoutes(app);
rankRoutes(app);
postRankLinkRoutes(app);
empPostRankLinkRoutes(app);
attendanceRoutes(app);
taxesAndDeductionRoutes(app);
taxDeductionPostRankLinkRoutes(app);
payrollRoutes(app);
reportRoutes(app);
fileUploadRoutes(app);

// Health Check
app.get("/paytrack/api/v1/health", (req, res) => {
  res.status(200).json({
    message:
      "::::: Welcome to PSCPL-Payroll-Server ::::: APIs are up and running. :::::",
  });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // Added 'next' parameter
  logger.error(err.message);
  res.status(500).send({
    status: 500,
    success: false,
    message: "Internal server error",
  });
});
// console.log("PORT: ", PORT)
// Start the server
app.listen(Number(PORT), () => {
  logger.info(`PSCPL Payroll Server started at PORT: ${PORT}`);
});

// const PORT = Number(process.env.PORT) || 8086;
// const HOST = "127.0.0.1";

// app.listen(PORT, HOST, () => {
//   console.log(`🚀 Server running at http://${HOST}:${PORT}`);
// });
