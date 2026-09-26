import Fastify from "fastify";
import cors from "@fastify/cors";
import { prisma, findPhoneNumberByE164, getUserByPhone, createUser, createReport, getReportCount, getUniqueReporterCount, getRecentReportCount, getReportsForPhone, createAuditEvent, createVerificationRecord, updateVerification, createIdentityClaim, getVerificationByEntity, getRiskBands, createNumberAlias, createBusiness, getBusinessById, getBusinessByName, verifyBusiness, rejectBusiness, linkNumberToBusiness, getPendingVerifications, getAuditEvents, getReportsForModeration, overrideRisk, createAppeal, getAppealsByUser, getAppealById, resolveAppeal, getReporterReputation, detectAbuseReporter, createFeedback, createBusinessPhoneVerification, verifyBusinessPhone, createBusinessDomainVerification, verifyBusinessDomain, createApiKey, getApiKeyById, getApiKeysByBusiness, revokeApiKey, createBusinessHours, getBusinessHours, searchBusinesses, searchNumbers, getDashboardStats, fuzzySearchBusinesses, humanOverrideReputation, moderateContent, createTwoFactorSecret, verifyTwoFactor, scanDependencies, searchWithPrivacy, updateBusinessLogo, updateBusinessCategory, updateUserSubscription, getUserSubscription, recordUsage, getUsage, createBilling, getBilling, grantEntitlement, getEntitlements, createMLFeature, createMLTrainingData, createMessageRisk, getURLReputation, createImpersonationAlert, createScamCampaign, createCallerID, createCallDirectory, createOfflineCache, createBlockList, createReportAfterCall, createSMSIntegration } from "@caller/database";
import { normalizePhone } from "@caller/phone";
import { calculateSpamScore } from "@caller/reputation";
import { signToken, verifyToken } from "@caller/auth";
import { Redis } from "ioredis";

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
const CACHE_TTL = 3600;
const RATE_LIMIT_WINDOW = 60;
const RATE_LIMIT_MAX = 30;

async function getCachedProfile(e164: string) {
  const cached = await redis.get(`profile:${e164}`);
  if (cached) return JSON.parse(cached);
  return null;
}

async function cacheProfile(e164: string, profile: unknown) {
  await redis.set(`profile:${e164}`, JSON.stringify(profile), "EX", CACHE_TTL);
}

async function getAuthenticatedUser(request: any) {
  try {
    const token = request.headers.authorization?.split(" ")[1];
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

async function requireAuth(request: any, reply: any) {
  const user = await getAuthenticatedUser(request);
  if (!user) { reply.code(401).send({ error: "Unauthorized" }); return null; }
  return user;
}

async function rateLimit(request: any, reply: any) {
  const ip = request.ip ?? request.headers["x-forwarded-for"] ?? "unknown";
  const key = `ratelimit:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, RATE_LIMIT_WINDOW);
  if (count > RATE_LIMIT_MAX) { reply.code(429).send({ error: "Too many requests" }); return false; }
  return true;
}

async function logAudit(request: any, action: string, details?: string) {
  try {
    const user = await getAuthenticatedUser(request);
    await createAuditEvent({ action, entityType: "api_request", details, actorId: user?.userId ?? undefined, ip: request.ip ?? request.headers["x-forwarded-for"] ?? null });
  } catch {}
}

app.addHook("onRequest", async (request, reply) => {
  if (!await rateLimit(request, reply)) return;
});

app.get("/health", async () => ({ ok: true, service: "caller-api" }));

app.get("/v1/numbers/:phone", async (request) => {
  const { phone } = request.params as { phone: string };
  const normalized = normalizePhone(decodeURIComponent(phone));
  const cached = await getCachedProfile(normalized);
  if (cached) { await logAudit(request, "NUMBER_LOOKUP", `cache_hit:${normalized}`); return cached; }
  const number = await findPhoneNumberByE164(normalized);
  if (!number) {
    await logAudit(request, "NUMBER_LOOKUP", `not_found:${normalized}`);
    await new Promise((r) => setTimeout(r, 100));
    return { number: normalized, profile: null, reputation: { score: 0, level: "low-risk", confidence: 0 } };
  }
  const reportCount = await getReportCount(number.id);
  const uniqueReporters = await getUniqueReporterCount(number.id);
  const recentReports = await getRecentReportCount(number.id);
  const reports = await getReportsForPhone(number.id) as { category: string }[];
  const trustedReports = reports.filter((r) => r.category === "SPAM" || r.category === "SCAM").length;
  const score = calculateSpamScore({ reportCount, uniqueReporters: uniqueReporters, recentReports, trustedReports, verifiedBusiness: number.business?.verified ?? false });
  const confidence = reportCount > 0 ? Math.min(100, (reportCount / 10) * 100) : 0;
  const risk = score >= 70 ? "high" : score >= 30 ? "medium" : "low";
  const profile = { number: normalized, displayName: number.displayName, verified: number.business?.verified ?? false, spamScore: score, confidence, risk, reportCount, categories: reports.map((r) => r.category) };
  await cacheProfile(normalized, profile);
  await logAudit(request, "NUMBER_LOOKUP", normalized);
  return profile;
});

app.post("/v1/numbers/:phone/reports", async (request, reply) => {
  const { phone } = request.params as { phone: string };
  const normalized = normalizePhone(decodeURIComponent(phone));
  const body = request.body as { category?: string; reason?: string } | undefined;
  const user = await getAuthenticatedUser(request) as { userId: string; phone: string } | null;
  const number = await findPhoneNumberByE164(normalized);
  if (!number) return reply.code(404).send({ error: "Number not found" });
  const report = await createReport({ phoneId: number.id, reporterId: (user?.userId as string) ?? "anonymous", category: (body?.category ?? "OTHER") as any, reason: body?.reason ?? undefined });
  await redis.del(`profile:${normalized}`);
  await logAudit(request, "REPORT_SUBMITTED", `${normalized}:${body?.category ?? "OTHER"}`);
  return reply.code(201).send({ number: normalized, accepted: true, reportId: report.id, category: body?.category ?? "other", reason: body?.reason ?? null });
});

app.post("/v1/auth/register", async (request, reply) => {
  const body = request.body as { phone: string; displayName?: string } | undefined;
  if (!body?.phone) return reply.code(400).send({ error: "Phone required" });
  const existing = await getUserByPhone(body.phone);
  if (existing) return reply.code(409).send({ error: "User already exists" });
  const user = await createUser(body.phone, body.displayName);
  const token = signToken({ userId: user.id, phone: user.phone });
  await logAudit(request, "USER_CREATED", body.phone);
  return reply.code(201).send({ token, user: { id: user.id, phone: user.phone, displayName: user.displayName } });
});

app.post("/v1/auth/login", async (request, reply) => {
  const body = request.body as { phone: string } | undefined;
  if (!body?.phone) return reply.code(400).send({ error: "Phone required" });
  const user = await getUserByPhone(body.phone);
  if (!user) return reply.code(404).send({ error: "User not found" });
  const token = signToken({ userId: user.id, phone: user.phone });
  await logAudit(request, "USER_LOGIN", body.phone);
  return { token };
});

app.post("/v1/verify/identity", async (request, reply) => {
  const body = request.body as { userId: string; claimType: string; claimValue: string } | undefined;
  if (!body?.userId || !body?.claimType || !body?.claimValue) return reply.code(400).send({ error: "Missing fields" });
  const claim = await createIdentityClaim({ userId: body.userId, phone: body.claimValue, claimType: body.claimType, claimValue: body.claimValue });
  await logAudit(request, "VERIFICATION_STARTED", `user:${body.userId}`);
  return reply.code(201).send({ claimId: claim.id, status: "pending" });
});

app.post("/v1/verify/record", async (request, reply) => {
  const body = request.body as { entityId: string; entityType: string; status: string; verifiedById?: string } | undefined;
  if (!body?.entityId || !body?.entityType) return reply.code(400).send({ error: "Missing fields" });
  const record = await createVerificationRecord({ entityId: body.entityId, entityType: body.entityType, status: body.status ?? "PENDING", verifiedById: body.verifiedById });
  await logAudit(request, "VERIFICATION_STARTED", `${body.entityType}:${body.entityId}`);
  return reply.code(201).send({ recordId: record.id, status: record.status });
});

app.patch("/v1/verify/:id", async (request, reply) => {
  const { id } = request.params as { id: string };
  const body = request.body as { status: string; verifiedById?: string } | undefined;
  if (!body?.status) return reply.code(400).send({ error: "Status required" });
  const record = await updateVerification(id, { status: body.status, verifiedById: body.verifiedById });
  await logAudit(request, "VERIFICATION_COMPLETED", `record:${id}`);
  return { recordId: record.id, status: record.status };
});

app.post("/v1/businesses", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const body = request.body as { name?: string; website?: string } | undefined;
  if (!body?.name) return reply.code(400).send({ error: "Name required" });
  const business = await createBusiness({ name: body.name, website: body.website });
  await logAudit(request, "VERIFICATION_STARTED", `business:${business.id}`);
  return reply.code(201).send({ id: business.id, name: business.name, website: business.website, verified: false });
});

app.post("/v1/businesses/:id/verify", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const { id } = request.params as { id: string };
  const body = request.body as { verifiedById?: string } | undefined;
  const business = await verifyBusiness(id, body?.verifiedById ?? user.userId);
  await logAudit(request, "VERIFICATION_COMPLETED", `business:${id}`);
  return { id: business.id, name: business.name, verified: true };
});

app.post("/v1/businesses/:id/reject", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const { id } = request.params as { id: string };
  const business = await rejectBusiness(id);
  await logAudit(request, "VERIFICATION_COMPLETED", `business:${id}:rejected`);
  return { id: business.id, name: business.name, verified: false };
});

app.post("/v1/businesses/:id/link-number", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const { id } = request.params as { id: string };
  const body = request.body as { phoneId: string } | undefined;
  if (!body?.phoneId) return reply.code(400).send({ error: "phoneId required" });
  const result = await linkNumberToBusiness(body.phoneId, id);
  return { phoneId: result.id, businessId: id };
});

app.get("/v1/businesses/:id", async (request) => {
  const { id } = request.params as { id: string };
  const business = await getBusinessById(id);
  if (!business) return { id, found: false };
  return { id: business.id, name: business.name, website: business.website, verified: business.verified, numbers: business.numbers };
});

app.get("/v1/businesses", async (request, reply) => {
  const query = request.query as { name?: string } | undefined; const name = query?.name;
  if (!name) return reply.code(400).send({ error: "name query param required" });
  const results = await getBusinessByName(name);
  return results.map((b) => ({ id: b.id, name: b.name, website: b.website, verified: b.verified }));
});

app.get("/v1/admin/risk-bands", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  return getRiskBands();
});

app.get("/v1/admin/audit-logs", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const query = request.query as { entityType?: string; entityId?: string; action?: string; since?: string; take?: string } | undefined;
  return getAuditEvents({ entityType: query?.entityType, entityId: query?.entityId, action: query?.action, since: query?.since ? new Date(query.since) : undefined, take: query?.take ? parseInt(query.take) : 50 });
});

app.get("/v1/admin/reports", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const query = request.query as { limit?: string } | undefined;
  return getReportsForModeration(query?.limit ? parseInt(query.limit) : 20);
});

app.get("/v1/admin/verifications", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  return getPendingVerifications();
});

app.patch("/v1/admin/reports/:id/override", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const { id } = request.params as { id: string };
  const body = request.body as { riskLevel: string; spamScore: number } | undefined;
  if (!body?.riskLevel || body.spamScore === undefined) return reply.code(400).send({ error: "riskLevel and spamScore required" });
  const result = await overrideRisk(id, body.riskLevel, body.spamScore);
  await logAudit(request, "REPUTATION_UPDATED", `override:${id}`);
  return { id: result.id, spamScore: result.spamScore, riskLevel: result.riskLevel };
});

app.post("/v1/reports/:id/feedback", async (request, reply) => {
  const { id } = request.params as { id: string };
  const body = request.body as { isFalsePositive: boolean; comment?: string } | undefined;
  const user = await getAuthenticatedUser(request) as { userId: string; phone: string } | null;
  if (!user) return reply.code(401).send({ error: "Unauthorized" });
  const feedback = await createFeedback({ reportId: id, userId: user.userId, isFalsePositive: body?.isFalsePositive ?? false, comment: body?.comment });
  await logAudit(request, "REPORT_PROCESSED", `feedback:${id}`);
  return reply.code(201).send({ feedbackId: feedback.id, isFalsePositive: feedback.isFalsePositive });
});

app.post("/v1/reports/:id/appeal", async (request, reply) => {
  const { id } = request.params as { id: string };
  const body = request.body as { reason: string } | undefined;
  const user = await getAuthenticatedUser(request) as { userId: string; phone: string } | null;
  if (!user) return reply.code(401).send({ error: "Unauthorized" });
  if (!body?.reason) return reply.code(400).send({ error: "Reason required" });
  const appeal = await createAppeal({ reportId: id, userId: user.userId, reason: body.reason });
  await logAudit(request, "REPORT_PROCESSED", `appeal:${id}`);
  return reply.code(201).send({ appealId: appeal.id, status: appeal.status });
});

app.get("/v1/appeals", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  return getAppealsByUser(user.userId);
});

app.patch("/v1/admin/appeals/:id/resolve", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const { id } = request.params as { id: string };
  const body = request.body as { resolution: string } | undefined;
  if (!body?.resolution) return reply.code(400).send({ error: "Resolution required" });
  const appeal = await resolveAppeal(id, body.resolution, user.userId);
  await logAudit(request, "REPORT_PROCESSED", `appeal_resolved:${id}`);
  return { appealId: appeal.id, status: appeal.status, resolution: appeal.resolution };
});

app.get("/v1/reporter/:id/reputation", async (request) => {
  const { id } = request.params as { id: string };
  return getReporterReputation(id);
});

app.get("/v1/admin/abuse-detection", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const q = request.query as { reporterId?: string } | undefined; const reporterId = q?.reporterId;
  if (!reporterId) return reply.code(400).send({ error: "reporterId required" });
  return detectAbuseReporter(reporterId);
});

app.get("/v1/reputation/example", async () => ({
  score: calculateSpamScore({ reportCount: 10, uniqueReporters: 8, recentReports: 4, trustedReports: 3, verifiedBusiness: false }),
}));

app.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  return reply.code(500).send({ error: "Internal server error" });
});

app.post("/v1/businesses/:id/verify-phone", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const { id } = request.params as { id: string };
  const body = request.body as { phone: string; code: string } | undefined;
  if (!body?.phone || !body?.code) return reply.code(400).send({ error: "phone and code required" });
  const verification = await createBusinessPhoneVerification({ businessId: id, phone: body.phone, code: body.code, expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
  return reply.code(201).send({ verificationId: verification.id, status: "pending" });
});

app.patch("/v1/businesses/:id/verify-phone/:phone", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const { id, phone } = request.params as { id: string; phone: string };
  const verification = await verifyBusinessPhone(id, phone);
  return { verified: verification.verified };
});

app.post("/v1/businesses/:id/verify-domain", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const { id } = request.params as { id: string };
  const body = request.body as { domain: string } | undefined;
  if (!body?.domain) return reply.code(400).send({ error: "domain required" });
  const verification = await createBusinessDomainVerification({ businessId: id, domain: body.domain, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
  return reply.code(201).send({ verificationId: verification.id, status: "pending" });
});

app.post("/v1/businesses/:id/api-keys", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const { id } = request.params as { id: string };
  const body = request.body as { name: string; permissions: string[] } | undefined;
  if (!body?.name) return reply.code(400).send({ error: "name required" });
  const key = `ck_${Math.random().toString(36).substring(2, 15)}`;
  const apiKey = await createApiKey({ businessId: id, key, name: body.name, permissions: body.permissions ?? ["read"] });
  return reply.code(201).send({ id: apiKey.id, key: apiKey.key, name: apiKey.name });
});

app.get("/v1/businesses/:id/api-keys", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const { id } = request.params as { id: string };
  return getApiKeysByBusiness(id);
});

app.delete("/v1/businesses/:id/api-keys/:keyId", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const { keyId } = request.params as { keyId: string };
  await revokeApiKey(keyId);
  return { revoked: true };
});

app.post("/v1/businesses/:id/hours", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const { id } = request.params as { id: string };
  const body = request.body as { dayOfWeek: number; openTime?: string; closeTime?: string; isOpen24h?: boolean } | undefined;
  if (body?.dayOfWeek === undefined) return reply.code(400).send({ error: "dayOfWeek required" });
  const hours = await createBusinessHours({ businessId: id, dayOfWeek: body.dayOfWeek, openTime: body.openTime, closeTime: body.closeTime, isOpen24h: body.isOpen24h });
  return hours;
});

app.get("/v1/businesses/:id/hours", async (request) => {
  const { id } = request.params as { id: string };
  return getBusinessHours(id);
});

app.get("/v1/search", async (request, reply) => {
  const query = request.query as { q?: string; verified?: string } | undefined; const q = query?.q; const verified = query?.verified;
  if (!q) return reply.code(400).send({ error: "q required" });
  const results = await searchBusinesses({ name: q, verified: verified === "true" ? true : verified === "false" ? false : undefined });
  return results.map((b) => ({ id: b.id, name: b.name, website: b.website, verified: b.verified }));
});
app.get("/v1/search/numbers", async (request, reply) => {
  const q = (request.query as { q?: string; verified?: string; riskLevel?: string; take?: string })?.q;
  if (!q) return reply.code(400).send({ error: "q required" });
  const results = await searchNumbers({ query: q, verified: (request.query as any)?.verified === "true" ? true : (request.query as any)?.verified === "false" ? false : undefined, riskLevel: (request.query as any)?.riskLevel, take: parseInt((request.query as any)?.take ?? "20") });
  return results.map((n) => ({ id: n.id, e164: n.e164, displayName: n.displayName, verified: n.verifiedBusinessId ? true : false }));
});

app.get("/v1/admin/dashboard", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  return getDashboardStats();
});

app.post("/v1/admin/bot-protection", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const body = request.body as { action: string; ip?: string; userAgent?: string } | undefined;
  if (!body?.action) return reply.code(400).send({ error: "action required" });
  const key = `bot:${body.ip ?? "unknown"}:${body.action}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 60);
  if (count > 100) { await logAudit(request as any, "NUMBER_BLOCKED", `bot:${body.ip}`); return reply.code(429).send({ error: "Bot detected" }); }
  return { allowed: true, count };
});
app.get("/v1/search/businesses", async (request, reply) => {
  const q = (request.query as { q?: string; verified?: string; take?: string })?.q;
  if (!q) return reply.code(400).send({ error: "q required" });
  const results = await fuzzySearchBusinesses({ query: q, verified: (request.query as any)?.verified === "true" ? true : (request.query as any)?.verified === "false" ? false : undefined, take: parseInt((request.query as any)?.take ?? "20") });
  return results.map((b) => ({ id: b.id, name: b.name, website: b.website, verified: b.verified }));
});

app.patch("/v1/admin/reports/:id/override", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const { id } = request.params as { id: string };
  const body = request.body as { spamScore: number; confidence: number; reason?: string } | undefined;
  if (body?.spamScore === undefined) return reply.code(400).send({ error: "spamScore required" });
  const result = await humanOverrideReputation(id, body.spamScore, body.confidence ?? 0, body?.reason ?? "");
  await logAudit(request, "REPUTATION_UPDATED", `override:${id}`);
  return { id: result.id, spamScore: result.spamScore, confidence: result.confidence };
});

app.post("/v1/admin/moderate", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const body = request.body as { reportId: string; action: string } | undefined;
  if (!body?.reportId || !body?.action) return reply.code(400).send({ error: "reportId and action required" });
  const result = await moderateContent(body.reportId, body.action, user.userId);
  return { reportId: body.reportId, action: body.action, processed: true };
});

app.post("/v1/auth/2fa/setup", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const body = request.body as { secret: string } | undefined;
  if (!body?.secret) return reply.code(400).send({ error: "secret required" });
  const tf = await createTwoFactorSecret(user.userId, body.secret);
  return { userId: tf.userId, setup: true };
});

app.post("/v1/auth/2fa/verify", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const body = request.body as { token: string } | undefined;
  if (!body?.token) return reply.code(400).send({ error: "token required" });
  const valid = await verifyTwoFactor(user.userId, body.token);
  return { valid };
});

app.get("/v1/admin/dependencies", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  return scanDependencies();
});

app.get("/v1/search/businesses", async (request, reply) => {
  const q = (request.query as { q?: string; take?: string })?.q;
  if (!q) return reply.code(400).send({ error: "q required" });
  const results = await searchWithPrivacy({ query: q, take: parseInt((request.query as any)?.take ?? "20") });
  return results.map((b) => ({ id: b.id, name: b.name, website: b.website, verified: b.verified }));
});

app.patch("/v1/businesses/:id/logo", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const { id } = request.params as { id: string };
  const body = request.body as { logo: string } | undefined;
  if (!body?.logo) return reply.code(400).send({ error: "logo required" });
  const result = await updateBusinessLogo(id, body.logo);
  return { id: result.id, logo: result.logo };
});

app.patch("/v1/businesses/:id/category", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const { id } = request.params as { id: string };
  const body = request.body as { category: string } | undefined;
  if (!body?.category) return reply.code(400).send({ error: "category required" });
  const result = await updateBusinessCategory(id, body.category);
  return { id: result.id, category: result.category };
});

app.patch("/v1/admin/users/:id/subscription", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const { id } = request.params as { id: string };
  const body = request.body as { tier: string } | undefined;
  if (!body?.tier) return reply.code(400).send({ error: "tier required" });
  const result = await updateUserSubscription(id, body.tier);
  return { id: result.id, subscription: result.subscription };
});

app.get("/v1/auth/subscription", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const tier = await getUserSubscription(user.userId);
  return { tier };
});

app.post("/v1/usage", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const body = request.body as { action: string; period: string } | undefined;
  if (!body?.action || !body?.period) return reply.code(400).send({ error: "action and period required" });
  const result = await recordUsage(user.userId, body.action, body.period);
  return { id: result.id, action: result.action, count: result.count };
});

app.get("/v1/usage", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const period = (request.query as { period?: string })?.period ?? "month";
  const usage = await getUsage(user.userId, period);
  return usage;
});

app.post("/v1/billing", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const body = request.body as { amount: number; currency?: string; period: string } | undefined;
  if (!body?.amount || !body?.period) return reply.code(400).send({ error: "amount and period required" });
  const result = await createBilling(user.userId, body.amount, body.currency ?? "USD", body.period);
  return { id: result.id, amount: result.amount, status: result.status };
});

app.get("/v1/billing", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const billing = await getBilling(user.userId);
  return billing;
});

app.post("/v1/entitlements", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const body = request.body as { feature: string } | undefined;
  if (!body?.feature) return reply.code(400).send({ error: "feature required" });
  const result = await grantEntitlement(user.userId, body.feature);
  return { id: result.id, feature: result.feature, granted: result.granted };
});

app.get("/v1/entitlements", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const entitlements = await getEntitlements(user.userId);
  return entitlements;
});

app.post("/v1/ml/features", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const body = request.body as { phoneId: string; feature: string; value: number } | undefined;
  if (!body?.phoneId || !body?.feature) return reply.code(400).send({ error: "phoneId and feature required" });
  const result = await createMLFeature(body.phoneId, body.feature, body.value ?? 0);
  return { id: result.id, feature: result.feature, value: result.value };
});

app.post("/v1/ml/training", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const body = request.body as { phoneId: string; label: string; features: string } | undefined;
  if (!body?.phoneId || !body?.label) return reply.code(400).send({ error: "phoneId and label required" });
  const result = await createMLTrainingData(body.phoneId, body.label, body.features ?? "");
  return { id: result.id, label: result.label };
});

app.post("/v1/messages/risk", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const body = request.body as { messageId: string; riskScore: number; riskLevel?: string } | undefined;
  if (!body?.messageId) return reply.code(400).send({ error: "messageId required" });
  const result = await createMessageRisk(body.messageId, body.riskScore, body.riskLevel ?? "LOW");
  return { id: result.id, riskScore: result.riskScore, riskLevel: result.riskLevel };
});

app.get("/v1/urls/:url", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const { url } = request.params as { url: string };
  const reputation = await getURLReputation(url);
  return reputation ?? { url, riskScore: 0, isPhishing: false, isMalware: false };
});

app.post("/v1/impersonation", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const body = request.body as { businessId: string; suspectedId: string; riskScore?: number } | undefined;
  if (!body?.businessId || !body?.suspectedId) return reply.code(400).send({ error: "businessId and suspectedId required" });
  const result = await createImpersonationAlert(body.businessId, body.suspectedId, body.riskScore ?? 0);
  return { id: result.id, riskScore: result.riskScore, status: result.status };
});

app.post("/v1/scam-campaigns", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const body = request.body as { name?: string; phoneIds: string[]; riskScore?: number } | undefined;
  if (!body?.phoneIds) return reply.code(400).send({ error: "phoneIds required" });
  const result = await createScamCampaign(body.name ?? "", body.phoneIds, body.riskScore ?? 0);
  return { id: result.id, name: result.name, riskScore: result.riskScore, status: result.status };
});

app.post("/v1/caller-id", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const body = request.body as { phoneId: string; displayName: string; source?: string } | undefined;
  if (!body?.phoneId || !body?.displayName) return reply.code(400).send({ error: "phoneId and displayName required" });
  const result = await createCallerID(body.phoneId, body.displayName, body.source ?? "USER");
  return { id: result.id, displayName: result.displayName, isVerified: result.isVerified };
});

app.post("/v1/call-directory", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const body = request.body as { phoneId: string; countryCode: string; carrier?: string } | undefined;
  if (!body?.phoneId || !body?.countryCode) return reply.code(400).send({ error: "phoneId and countryCode required" });
  const result = await createCallDirectory(body.phoneId, body.countryCode, body.carrier);
  return { id: result.id, phoneId: result.phoneId, countryCode: result.countryCode, isSpam: result.isSpam };
});

app.post("/v1/offline-cache", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const body = request.body as { phoneId: string; data: string; expiresAt: string } | undefined;
  if (!body?.phoneId || !body?.data || !body?.expiresAt) return reply.code(400).send({ error: "phoneId, data, and expiresAt required" });
  const result = await createOfflineCache(body.phoneId, body.data, new Date(body.expiresAt));
  return { id: result.id, phoneId: result.phoneId, expiresAt: result.expiresAt };
});

app.post("/v1/block", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const body = request.body as { phoneId: string; reason?: string } | undefined;
  if (!body?.phoneId) return reply.code(400).send({ error: "phoneId required" });
  const result = await createBlockList(user.userId, body.phoneId, body.reason);
  return { id: result.id, phoneId: result.phoneId, reason: result.reason };
});

app.post("/v1/report-after-call", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const body = request.body as { phoneId: string; reportId?: string } | undefined;
  if (!body?.phoneId) return reply.code(400).send({ error: "phoneId required" });
  const result = await createReportAfterCall(body.phoneId, user.userId, body.reportId);
  return { id: result.id, phoneId: result.phoneId, reportId: result.reportId };
});

app.post("/v1/sms", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;
  const body = request.body as { phoneId: string; messageId?: string; content?: string; riskScore?: number } | undefined;
  if (!body?.phoneId) return reply.code(400).send({ error: "phoneId required" });
  const result = await createSMSIntegration(body.phoneId, body.messageId, body.content, body.riskScore ?? 0);
  return { id: result.id, phoneId: result.phoneId, riskScore: result.riskScore };
});

app.listen({ port: 4000, host: "0.0.0.0" });
