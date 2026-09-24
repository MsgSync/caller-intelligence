import Fastify from "fastify";
import cors from "@fastify/cors";
import { normalizePhone } from "@caller/phone";
import { calculateSpamScore } from "@caller/reputation";

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

app.get("/health", async () => ({ ok: true, service: "caller-api" }));

app.get("/v1/numbers/:phone", async (request) => {
  const { phone } = request.params as { phone: string };
  const normalized = normalizePhone(decodeURIComponent(phone));
  return {
    number: normalized,
    identity: null,
    reputation: {
      score: 0,
      level: "low-risk",
      confidence: 0
    },
    message: "Lookup service scaffold — connect Prisma repository next."
  };
});

app.post("/v1/numbers/:phone/reports", async (request, reply) => {
  const { phone } = request.params as { phone: string };
  const normalized = normalizePhone(decodeURIComponent(phone));
  const body = request.body as { category?: string; reason?: string } | undefined;

  return reply.code(201).send({
    number: normalized,
    accepted: true,
    category: body?.category ?? "other",
    reason: body?.reason ?? null,
    next: "Persist report and recompute reputation asynchronously."
  });
});

app.get("/v1/reputation/example", async () => ({
  score: calculateSpamScore({
    reportCount: 10,
    uniqueReporters: 8,
    recentReports: 4,
    trustedReports: 3,
    verifiedBusiness: false
  })
}));

app.listen({ port: 4000, host: "0.0.0.0" });
