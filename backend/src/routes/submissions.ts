import { Router } from "express";
import { z } from "zod";
import { isValidObjectId } from "mongoose";
import { CATEGORIES, PRIORITIES, STATUSES, Submission } from "../models/Submission.js";
import { triageSubmission } from "../services/llm.js";

export const router = Router();

const createSchema = z.object({
  source: z.string().max(50).optional(),
  name: z.string().max(200).optional(),
  email: z.string().email().optional().or(z.literal("")),
  company: z.string().max(200).optional(),
  message: z.string().min(1).max(10000),
});

async function runTriage(id: string) {
  const doc = await Submission.findById(id);
  if (!doc) return null;
  try {
    const t = await triageSubmission(doc);
    doc.triage = { ...t, triagedAt: new Date() } as never;
    doc.triageError = undefined;
  } catch (err) {
    doc.triageError = err instanceof Error ? err.message : String(err);
  }
  await doc.save();
  return doc;
}

// Create + triage. Called by n8n on each new form submission.
router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: parsed.error.flatten() });
  const created = await Submission.create(parsed.data);
  const doc = await runTriage(created.id);
  res.status(201).json(doc);
});

router.get("/stats", async (_req, res) => {
  const [byCategory, byPriority, byStatus, total] = await Promise.all([
    Submission.aggregate([{ $group: { _id: "$triage.category", count: { $sum: 1 } } }]),
    Submission.aggregate([{ $group: { _id: "$triage.priority", count: { $sum: 1 } } }]),
    Submission.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Submission.countDocuments(),
  ]);
  const toMap = (rows: { _id: string | null; count: number }[]) =>
    Object.fromEntries(rows.map((r) => [r._id ?? "untriaged", r.count]));
  res.json({ total, byCategory: toMap(byCategory), byPriority: toMap(byPriority), byStatus: toMap(byStatus) });
});

router.get("/", async (req, res) => {
  const q = z
    .object({
      category: z.enum(CATEGORIES).optional(),
      priority: z.enum(PRIORITIES).optional(),
      status: z.enum(STATUSES).optional(),
      q: z.string().max(200).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(25),
    })
    .safeParse(req.query);
  if (!q.success) return void res.status(400).json({ error: q.error.flatten() });
  const { category, priority, status, q: text, page, limit } = q.data;

  const filter: Record<string, unknown> = {};
  if (category) filter["triage.category"] = category;
  if (priority) filter["triage.priority"] = priority;
  if (status) filter.status = status;
  if (text) filter.$text = { $search: text };

  const [items, total] = await Promise.all([
    Submission.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Submission.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
});

router.get("/:id", async (req, res) => {
  if (!isValidObjectId(req.params.id)) return void res.status(400).json({ error: "Invalid id" });
  const doc = await Submission.findById(req.params.id);
  if (!doc) return void res.status(404).json({ error: "Not found" });
  res.json(doc);
});

router.patch("/:id", async (req, res) => {
  if (!isValidObjectId(req.params.id)) return void res.status(400).json({ error: "Invalid id" });
  const body = z.object({ status: z.enum(STATUSES) }).safeParse(req.body);
  if (!body.success) return void res.status(400).json({ error: body.error.flatten() });
  const doc = await Submission.findByIdAndUpdate(req.params.id, body.data, { new: true });
  if (!doc) return void res.status(404).json({ error: "Not found" });
  res.json(doc);
});

router.post("/:id/retriage", async (req, res) => {
  if (!isValidObjectId(req.params.id)) return void res.status(400).json({ error: "Invalid id" });
  const doc = await runTriage(req.params.id);
  if (!doc) return void res.status(404).json({ error: "Not found" });
  res.json(doc);
});
