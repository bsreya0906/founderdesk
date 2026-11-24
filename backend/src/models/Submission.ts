import { Schema, model, InferSchemaType } from "mongoose";

export const CATEGORIES = [
  "bug",
  "feature_request",
  "praise",
  "complaint",
  "partnership",
  "investor_inquiry",
  "job_application",
  "support",
  "other",
] as const;
export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const SENTIMENTS = ["positive", "neutral", "negative"] as const;
export const STATUSES = ["new", "in_review", "resolved", "archived"] as const;

const triageSchema = new Schema(
  {
    summary: String,
    category: { type: String, enum: CATEGORIES },
    priority: { type: String, enum: PRIORITIES },
    sentiment: { type: String, enum: SENTIMENTS },
    suggestedAction: String,
    tags: [String],
    model: String,
    triagedAt: Date,
  },
  { _id: false }
);

const submissionSchema = new Schema(
  {
    source: { type: String, default: "form" },
    name: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    company: { type: String, trim: true },
    message: { type: String, required: true },
    status: { type: String, enum: STATUSES, default: "new", index: true },
    triage: triageSchema,
    triageError: String,
  },
  { timestamps: true }
);

submissionSchema.index({ "triage.category": 1, "triage.priority": 1, createdAt: -1 });
submissionSchema.index({ message: "text", name: "text", company: "text", "triage.summary": "text" });

export type SubmissionDoc = InferSchemaType<typeof submissionSchema>;
export const Submission = model("Submission", submissionSchema);
