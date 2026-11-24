// Demo mode: when BACKEND_URL is not set, the proxy route serves this in-memory
// data with a keyword-based triage, so the dashboard works with no backend.
// State lives in the server instance memory and resets on cold start.
import type { Category, Priority, Status, Submission } from "./types";

type Triage = NonNullable<Submission["triage"]>;

const RULES: { category: Category; words: RegExp; action: string }[] = [
  { category: "investor_inquiry", words: /\b(invest|investor|seed|series [a-c]|funding|vc|term sheet)\b/i, action: "Reply within a day and share the deck." },
  { category: "bug", words: /\b(crash|bug|error|broken|fail|not working|down|outage|glitch)\w*/i, action: "Reproduce the issue and open a ticket for engineering." },
  { category: "job_application", words: /\b(appl(y|ying|ication)|resume|cv|hiring|position|role|intern)\b/i, action: "Forward to the hiring pipeline and send an acknowledgement." },
  { category: "partnership", words: /\b(partner|partnership|collaborat|integrat|reseller|co-?market)\w*/i, action: "Book an intro call to explore fit." },
  { category: "feature_request", words: /\b(feature|would be (great|nice)|please add|wish|could you add|support for)\b/i, action: "Log it on the roadmap board and tell the requester." },
  { category: "complaint", words: /\b(disappointed|unhappy|terrible|worst|refund|cancel|angry|frustrat)\w*/i, action: "Reach out personally to resolve it." },
  { category: "praise", words: /\b(love|great|amazing|awesome|thank|fantastic|excellent)\w*/i, action: "Say thanks and ask for a testimonial." },
  { category: "support", words: /\b(how do i|help|can't|cannot|unable|question|login|password)\b/i, action: "Send the relevant help article or answer directly." },
];

function triage(message: string): Triage {
  const rule = RULES.find((r) => r.words.test(message));
  const category: Category = rule?.category ?? "other";
  const urgent = /\b(urgent|asap|losing (customers|money)|data loss|outage|security|legal|lawsuit)\b|!{2,}/i.test(message);
  const priority: Priority = urgent ? "urgent" : category === "investor_inquiry" || category === "bug" ? "high" : category === "praise" || category === "other" ? "low" : "medium";
  const negative = /\b(crash|broken|fail|terrible|worst|disappointed|angry|frustrat|refund|cancel|down)\w*/i.test(message);
  const positive = /\b(love|great|amazing|awesome|thank|fantastic|excellent)\w*/i.test(message);
  const sentiment = negative ? "negative" : positive ? "positive" : "neutral";
  const text = message.replace(/\s+/g, " ").trim();
  return {
    summary: text.length > 160 ? `${text.slice(0, 157)}...` : text,
    category, priority, sentiment,
    suggestedAction: rule?.action ?? "Read it and decide whether it needs a reply.",
    tags: [category.replace(/_/g, "-"), priority, sentiment],
    model: "demo-keyword-v1",
  };
}

const SEED = [
  ["Asha Rao", "asha@brightcart.io", "BrightCart", "Checkout crashes on iOS Safari and we are losing customers every hour. Please look at this ASAP!!"],
  ["Daniel Kim", "dan@northwind.vc", "Northwind Ventures", "We loved your demo. Our fund is looking at seed investments in dev tools and would like a call this week."],
  ["Priya Nair", "priya@gmail.com", "", "I'm applying for the founding engineer role. Resume attached, I have 4 years of Node and React experience."],
  ["Tom Becker", "tom@fieldly.app", "Fieldly", "Would be great to have a Slack integration so the team gets pinged on new leads. Any plans for that?"],
  ["Lena Ortiz", "lena@hello.dev", "", "Honestly love the product. The onboarding was smooth and support replied in minutes. Thank you!"],
  ["Mark Silva", "mark@acme.co", "Acme", "I'm disappointed. I asked for a refund twice and nobody has answered. I will cancel the plan."],
  ["Sara Chen", "sara@loopstack.com", "Loopstack", "We would like to explore a partnership. Our platform could integrate with yours and co-market to our users."],
  ["Ravi Menon", "ravi@example.com", "", "How do I reset my password? The login page keeps saying invalid link."],
] as const;

let store: Submission[] | null = null;
function db(): Submission[] {
  if (!store) {
    store = SEED.map(([name, email, company, message], i) => ({
      _id: `demo${i + 1}`, source: "demo", name, email, company: company || undefined, message,
      status: (i < 5 ? "new" : "in_review") as Status,
      triage: triage(message),
      createdAt: new Date(Date.now() - i * 5 * 3_600_000).toISOString(),
    }));
  }
  return store;
}

const json = (body: unknown, status = 200) => ({ status, body });
const count = (items: Submission[], pick: (s: Submission) => string) =>
  items.reduce<Record<string, number>>((m, s) => ((m[pick(s)] = (m[pick(s)] ?? 0) + 1), m), {});

export function demoHandle(method: string, path: string[], search: URLSearchParams, body: unknown) {
  const items = db();
  const [, id, action] = path; // path[0] === "submissions"
  if (path[0] !== "submissions") return json({ error: "Not found" }, 404);

  if (!id && method === "GET") {
    const q = search.get("q")?.toLowerCase();
    const list = items
      .filter((s) => !search.get("category") || s.triage?.category === search.get("category"))
      .filter((s) => !search.get("priority") || s.triage?.priority === search.get("priority"))
      .filter((s) => !search.get("status") || s.status === search.get("status"))
      .filter((s) => !q || `${s.name} ${s.company} ${s.message} ${s.triage?.summary}`.toLowerCase().includes(q))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return json({ items: list, total: list.length, page: 1, pages: 1 });
  }
  if (!id && method === "POST") {
    const b = (body ?? {}) as { name?: string; email?: string; company?: string; message?: string };
    if (!b.message?.trim()) return json({ error: "message is required" }, 400);
    const s: Submission = { _id: `demo${Date.now()}`, source: "form", name: b.name, email: b.email, company: b.company, message: b.message.slice(0, 10000), status: "new", triage: triage(b.message), createdAt: new Date().toISOString() };
    items.unshift(s);
    return json(s, 201);
  }
  if (id === "stats") {
    return json({ total: items.length, byCategory: count(items, (s) => s.triage?.category ?? "untriaged"), byPriority: count(items, (s) => s.triage?.priority ?? "untriaged"), byStatus: count(items, (s) => s.status) });
  }
  const s = items.find((x) => x._id === id);
  if (!s) return json({ error: "Not found" }, 404);
  if (method === "GET") return json(s);
  if (method === "PATCH") {
    const status = (body as { status?: Status })?.status;
    if (!status || !["new", "in_review", "resolved", "archived"].includes(status)) return json({ error: "Invalid status" }, 400);
    s.status = status;
    return json(s);
  }
  if (method === "POST" && action === "retriage") {
    s.triage = triage(s.message);
    return json(s);
  }
  return json({ error: "Not found" }, 404);
}
