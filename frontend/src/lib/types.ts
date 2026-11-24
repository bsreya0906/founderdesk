export type Category = "bug" | "feature_request" | "praise" | "complaint" | "partnership" | "investor_inquiry" | "job_application" | "support" | "other";
export type Priority = "low" | "medium" | "high" | "urgent";
export type Status = "new" | "in_review" | "resolved" | "archived";

export interface Submission {
  _id: string;
  source: string;
  name?: string;
  email?: string;
  company?: string;
  message: string;
  status: Status;
  triage?: {
    summary: string;
    category: Category;
    priority: Priority;
    sentiment: "positive" | "neutral" | "negative";
    suggestedAction: string;
    tags: string[];
    model: string;
  };
  triageError?: string;
  createdAt: string;
}

export interface Stats {
  total: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  byStatus: Record<string, number>;
}

export const CATEGORIES: Category[] = ["bug", "feature_request", "praise", "complaint", "partnership", "investor_inquiry", "job_application", "support", "other"];
export const PRIORITIES: Priority[] = ["urgent", "high", "medium", "low"];
export const STATUSES: Status[] = ["new", "in_review", "resolved", "archived"];
export const label = (s: string) => s.replace(/_/g, " ");
