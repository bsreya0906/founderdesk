import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { config } from "../config.js";

export const requireApiKey: RequestHandler = (req, res, next) => {
  const given = Buffer.from(String(req.header("x-api-key") ?? ""));
  const expected = Buffer.from(config.apiKey);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
};
