import mongoose from "mongoose";
import { config } from "./config.js";
import { Submission } from "./models/Submission.js";
import { triageSubmission } from "./services/llm.js";

const DEMO = [
  { name: "Asha Rao", email: "asha@brightcart.io", company: "BrightCart", message: "Checkout crashes on iOS Safari and we are losing customers every hour. Please look at this ASAP!!" },
  { name: "Daniel Kim", email: "dan@northwind.vc", company: "Northwind Ventures", message: "We loved your demo. Our fund is looking at seed investments in dev tools and would like a call this week." },
  { name: "Priya Nair", email: "priya@gmail.com", message: "I'm applying for the founding engineer role. Resume attached, I have 4 years of Node and React experience." },
  { name: "Tom Becker", email: "tom@fieldly.app", company: "Fieldly", message: "Would be great to have a Slack integration so the team gets pinged on new leads. Any plans for that?" },
  { name: "Lena Ortiz", email: "lena@hello.dev", message: "Honestly love the product. The onboarding was smooth and support replied in minutes. Thank you!" },
  { name: "Mark Silva", email: "mark@acme.co", company: "Acme", message: "I'm disappointed. I asked for a refund twice and nobody has answered. I will cancel the plan." },
  { name: "Sara Chen", email: "sara@loopstack.com", company: "Loopstack", message: "We would like to explore a partnership. Our platform could integrate with yours and co-market to our users." },
  { name: "Ravi Menon", email: "ravi@example.com", message: "How do I reset my password? The login page keeps saying invalid link." },
];

async function seed() {
  if ((await Submission.countDocuments()) > 0) return;
  for (let i = 0; i < DEMO.length; i++) {
    const d = DEMO[i]!;
    const t = await triageSubmission(d);
    await Submission.create({
      ...d,
      source: "demo",
      status: i < 5 ? "new" : "in_review",
      triage: { ...t, triagedAt: new Date() },
      createdAt: new Date(Date.now() - i * 3_600_000 * 5),
    });
  }
  console.log(`Seeded ${DEMO.length} demo submissions`);
}

export async function connectDb() {
  let uri = config.mongoUri;
  const inMemory = uri === "memory";
  if (inMemory) {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    const server = await MongoMemoryServer.create();
    uri = server.getUri();
    console.log("Using in-memory MongoDB (data resets on restart)");
  }
  await mongoose.connect(uri);
  await Submission.init();
  if (inMemory) await seed();
}
