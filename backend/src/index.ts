import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { connectDb } from "./db.js";
import { config } from "./config.js";
import { requireApiKey } from "./middleware/auth.js";
import { router as submissions } from "./routes/submissions.js";

const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: config.corsOrigins }));
app.use(express.json({ limit: "100kb" }));
app.use(rateLimit({ windowMs: 60_000, limit: 120 }));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/submissions", requireApiKey, submissions);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

await connectDb();
app.listen(config.port, () => console.log(`FounderDesk API on :${config.port}`));
