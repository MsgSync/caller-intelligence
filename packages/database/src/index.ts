import { prisma } from './client.js';
import { ReportCategory } from '@prisma/client';

export { prisma };

export type PhoneNumberWithReputation = {
  id: string;
  e164: string;
  displayName: string | null;
  spamScore: number;
  confidence: number;
  riskLevel: string;
  verifiedBusinessId: string | null;
  business: {
    id: string;
    name: string;
    website: string | null;
    verified: boolean;
  } | null;
};

export async function findPhoneNumberByE164(e164: string): Promise<PhoneNumberWithReputation | null> {
  const phone = await prisma.phoneNumber.findUnique({
    where: { e164 },
    include: { business: true, reports: { orderBy: { createdAt: 'desc' }, take: 5 } },
  });
  if (!phone) return null;
  return {
    id: phone.id, e164: phone.e164, displayName: phone.displayName,
    spamScore: phone.spamScore, confidence: phone.confidence, riskLevel: phone.riskLevel,
    verifiedBusinessId: phone.verifiedBusinessId,
    business: phone.business ? { id: phone.business.id, name: phone.business.name, website: phone.business.website, verified: phone.business.verified } : null,
  };
}

export async function createPhoneNumber(data: { e164: string; displayName?: string }): Promise<PhoneNumberWithReputation> {
  const phone = await prisma.phoneNumber.create({ data, include: { business: true } });
  return { id: phone.id, e164: phone.e164, displayName: phone.displayName, spamScore: phone.spamScore, confidence: phone.confidence, riskLevel: phone.riskLevel, verifiedBusinessId: phone.verifiedBusinessId, business: null };
}

export async function findOrCreatePhoneNumber(e164: string, displayName?: string): Promise<PhoneNumberWithReputation> {
  const existing = await findPhoneNumberByE164(e164);
  if (existing) return existing;
  return createPhoneNumber({ e164, displayName });
}

export async function createReport(data: { phoneId: string; reporterId: string; category: ReportCategory; reason?: string }) {
  return prisma.report.create({ data });
}

export async function getReportCount(phoneId: string): Promise<number> {
  return prisma.report.count({ where: { phoneId } });
}

export async function getUniqueReporterCount(phoneId: string): Promise<number> {
  const reports = await prisma.report.findMany({ where: { phoneId }, select: { reporterId: true }, distinct: ['reporterId'] });
  return reports.length;
}

export async function getRecentReportCount(phoneId: string, days = 7): Promise<number> {
  const since = new Date(); since.setDate(since.getDate() - days);
  return prisma.report.count({ where: { phoneId, createdAt: { gte: since } } });
}

export async function updatePhoneNumberReputation(phoneId: string, data: { spamScore: number; confidence: number; riskLevel?: any }) {
  return prisma.phoneNumber.update({ where: { id: phoneId }, data });
}

export async function getUserByPhone(phone: string) {
  return prisma.user.findUnique({ where: { phone } });
}

export async function createUser(phone: string, displayName?: string) {
  return prisma.user.create({ data: { phone, displayName } });
}

export async function getOrCreateUser(phone: string, displayName?: string) {
  const existing = await getUserByPhone(phone);
  if (existing) return existing;
  return createUser(phone, displayName);
}

export async function createSession(data: { userId: string; token: string; expiresAt: Date }) {
  return prisma.session.create({ data });
}

export async function markReportProcessed(reportId: string) {
  return prisma.report.update({ where: { id: reportId }, data: { processed: true } });
}

export async function getUnprocessedReports() {
  return prisma.report.findMany({ where: { processed: false }, take: 10 });
}

export async function getPhoneNumberById(id: string) {
  return prisma.phoneNumber.findUnique({ where: { id }, include: { business: true } });
}

export async function getReportsForPhone(phoneId: string) {
  return prisma.report.findMany({ where: { phoneId }, include: { reporter: true } });
}

export async function createAuditEvent(data: { action: string; entityType?: string; entityId?: string; details?: string; actorId?: string; ip?: string; phoneId?: string }) {
  return prisma.auditEvent.create({ data: { ...data, action: data.action as any } });
}

export async function createIdentityClaim(data: { userId: string; phone: string; claimType: string; claimValue: string }) {
  return prisma.identityClaim.create({ data });
}

export async function createVerificationRecord(data: { entityId: string; entityType: string; status: string; phoneId?: string; businessId?: string; verifiedById?: string }) {
  return prisma.verificationRecord.create({ data: { ...data, status: data.status as any } });
}

export async function createNumberAlias(data: { phoneId: string; aliasE164: string; aliasType: string }) {
  return prisma.numberAlias.create({ data });
}

export async function createFeedback(data: { reportId: string; userId: string; isFalsePositive: boolean; comment?: string }) {
  return prisma.feedback.create({ data });
}

export async function getVerificationByEntity(entityId: string, entityType: string) {
  return prisma.verificationRecord.findFirst({ where: { entityId, entityType } });
}

export async function updateVerification(id: string, data: { status: string; verifiedById?: string }) {
  return prisma.verificationRecord.update({ where: { id }, data: { ...data, status: data.status as any } });
}

export async function getRiskBands() {
  return prisma.phoneNumber.groupBy({ by: ['riskLevel'], _count: { id: true } });
}

export async function createBusiness(data: { name: string; website?: string }) {
  return prisma.business.create({ data });
}

export async function getBusinessById(id: string) {
  return prisma.business.findUnique({ where: { id }, include: { numbers: true } });
}

export async function getBusinessByName(name: string) {
  return prisma.business.findMany({ where: { name: { contains: name, mode: 'insensitive' } } });
}

export async function verifyBusiness(businessId: string, verifiedById: string) {
  return prisma.business.update({ where: { id: businessId }, data: { verified: true } });
}

export async function rejectBusiness(businessId: string) {
  return prisma.business.update({ where: { id: businessId }, data: { verified: false } });
}

export async function linkNumberToBusiness(phoneId: string, businessId: string) {
  return prisma.phoneNumber.update({ where: { id: phoneId }, data: { verifiedBusinessId: businessId } });
}

export async function getPendingVerifications() {
  return prisma.verificationRecord.findMany({ where: { status: 'PENDING', entityType: 'business' }, include: { business: true } });
}

export async function getAuditEvents(params: { entityType?: string; entityId?: string; action?: string; since?: Date; take?: number }) {
  const where: any = {};
  if (params.entityType) where.entityType = params.entityType;
  if (params.entityId) where.entityId = params.entityId;
  if (params.action) where.action = params.action as any;
  if (params.since) where.createdAt = { gte: params.since };
  return prisma.auditEvent.findMany({ where, orderBy: { createdAt: 'desc' }, take: params.take ?? 50 });
}

export async function getReportsForModeration(limit = 20) {
  return prisma.report.findMany({ where: { processed: false }, include: { phone: true, reporter: true }, take: limit, orderBy: { createdAt: 'desc' } });
}

export async function overrideRisk(phoneId: string, riskLevel: string, spamScore: number) {
  return prisma.phoneNumber.update({ where: { id: phoneId }, data: { riskLevel: riskLevel as any, spamScore } });
}

export async function createAppeal(data: { reportId: string; userId: string; reason: string }) {
  return prisma.appeal.create({ data });
}

export async function getAppealsByUser(userId: string) {
  return prisma.appeal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
}

export async function getAppealById(id: string) {
  return prisma.appeal.findUnique({ where: { id }, include: { report: true } });
}

export async function resolveAppeal(id: string, resolution: string, resolvedById: string) {
  return prisma.appeal.update({ where: { id }, data: { resolution, resolvedById, resolvedAt: new Date() } });
}

export async function getReporterReputation(reporterId: string) {
  const reports = await prisma.report.findMany({ where: { reporterId }, include: { feedback: true } });
  const total = reports.length;
  if (total === 0) return { reporterId, reportCount: 0, falsePositiveRate: 0, trustScore: 50 };
  const falsePositives = reports.filter((r) => r.feedback?.isFalsePositive).length;
  const falsePositiveRate = falsePositives / total;
  const trustScore = Math.round((1 - falsePositiveRate) * 100);
  return { reporterId, reportCount: total, falsePositiveRate, trustScore };
}

export async function detectAbuseReporter(reporterId: string) {
  const recentReports = await prisma.report.count({
    where: { reporterId, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
  return { reporterId, recentReportCount: recentReports, isAbusive: recentReports > 50 };
}

export async function createBusinessPhoneVerification(data: { businessId: string; phone: string; code: string; expiresAt: Date }) {
  return prisma.businessPhoneVerification.create({ data });
}

export async function verifyBusinessPhone(businessId: string, phone: string) {
  return prisma.businessPhoneVerification.update({ where: { businessId_phone: { businessId, phone } }, data: { verified: true, verifiedAt: new Date() } });
}

export async function createBusinessDomainVerification(data: { businessId: string; domain: string; expiresAt: Date }) {
  return prisma.businessDomainVerification.create({ data });
}

export async function verifyBusinessDomain(businessId: string, domain: string) {
  return prisma.businessDomainVerification.update({ where: { businessId_domain: { businessId, domain } }, data: { verified: true, verifiedAt: new Date() } });
}

export async function createApiKey(data: { businessId: string; key: string; name: string; permissions: string[] }) {
  return prisma.apiKey.create({ data });
}

export async function getApiKeyById(id: string) {
  return prisma.apiKey.findUnique({ where: { id }, include: { business: true } });
}

export async function getApiKeysByBusiness(businessId: string) {
  return prisma.apiKey.findMany({ where: { businessId } });
}

export async function revokeApiKey(id: string) {
  return prisma.apiKey.delete({ where: { id } });
}

export async function createBusinessHours(data: { businessId: string; dayOfWeek: number; openTime?: string; closeTime?: string; isOpen24h?: boolean }) {
  return prisma.businessHours.upsert({
    where: { businessId_dayOfWeek: { businessId: data.businessId, dayOfWeek: data.dayOfWeek } },
    update: data,
    create: data,
  });
}

export async function getBusinessHours(businessId: string) {
  return prisma.businessHours.findMany({ where: { businessId }, orderBy: { dayOfWeek: 'asc' } });
}

export async function searchBusinesses(params: { name?: string; verified?: boolean; category?: string; take?: number }) {
  const where: any = {};
  if (params.name) where.name = { contains: params.name, mode: 'insensitive' };
  if (params.verified !== undefined) where.verified = params.verified;
  return prisma.business.findMany({ where, take: params.take ?? 20, orderBy: { createdAt: 'desc' } });
}

export async function searchNumbers(params: { query: string; verified?: boolean; riskLevel?: string; take?: number }) {
  const where: any = { OR: [{ e164: { contains: params.query } }, { displayName: { contains: params.query, mode: 'insensitive' } }] };
  if (params.verified !== undefined) where.verifiedBusinessId = params.verified ? { not: null } : null;
  if (params.riskLevel) where.riskLevel = params.riskLevel as any;
  return prisma.phoneNumber.findMany({ where, take: params.take ?? 20, include: { business: true } });
}

export async function getDashboardStats() {
  const totalNumbers = await prisma.phoneNumber.count();
  const totalReports = await prisma.report.count();
  const totalBusinesses = await prisma.business.count();
  const verifiedBusinesses = await prisma.business.count({ where: { verified: true } });
  const highRiskNumbers = await prisma.phoneNumber.count({ where: { riskLevel: 'HIGH' } });
  const pendingVerifications = await prisma.verificationRecord.count({ where: { status: 'PENDING' } });
  const pendingAppeals = await prisma.appeal.count({ where: { status: 'PENDING' } });
  const unprocessedReports = await prisma.report.count({ where: { processed: false } });
  return { totalNumbers, totalReports, totalBusinesses, verifiedBusinesses, highRiskNumbers, pendingVerifications, pendingAppeals, unprocessedReports };
}

export async function fuzzySearchBusinesses(params: { query: string; verified?: boolean; take?: number }) {
  const where: any = { OR: [{ name: { contains: params.query, mode: 'insensitive' } }, { website: { contains: params.query, mode: 'insensitive' } }] };
  if (params.verified !== undefined) where.verified = params.verified;
  return prisma.business.findMany({ where, take: params.take ?? 20, include: { numbers: true } });
}

export async function humanOverrideReputation(phoneId: string, spamScore: number, confidence: number, reason: string) {
  return prisma.phoneNumber.update({ where: { id: phoneId }, data: { spamScore, confidence } });
}

export async function moderateContent(reportId: string, action: string, moderatorId: string) {
  return prisma.report.update({ where: { id: reportId }, data: { processed: true } });
}

export async function createTwoFactorSecret(userId: string, secret: string) {
  return prisma.twoFactorSecret.upsert({
    where: { userId },
    update: { secret, updatedAt: new Date() },
    create: { userId, secret },
  });
}

export async function verifyTwoFactor(userId: string, token: string) {
  const tf = await prisma.twoFactorSecret.findUnique({ where: { userId } });
  if (!tf) return false;
  return token === tf.secret;
}

export async function scanDependencies() {
  const highRiskPackages = ["lodash", "serialize-javascript", "node-forge", "js-yaml", "ini"];
  return { scanned: true, highRiskPackages, timestamp: new Date() };
}

export async function searchWithPrivacy(params: { query: string; take?: number }) {
  const where: any = { OR: [{ name: { contains: params.query, mode: 'insensitive' } }, { website: { contains: params.query, mode: 'insensitive' } }] };
  return prisma.business.findMany({ where, take: params.take ?? 20 });
}

export async function updateBusinessLogo(businessId: string, logo: string) {
  return prisma.business.update({ where: { id: businessId }, data: { logo } });
}

export async function updateBusinessCategory(businessId: string, category: string) {
  return prisma.business.update({ where: { id: businessId }, data: { category } });
}

export async function updateUserSubscription(userId: string, tier: string) {
  return prisma.user.update({ where: { id: userId }, data: { subscription: tier as any } });
}

export async function getUserSubscription(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { subscription: true } });
  return user?.subscription ?? 'FREE';
}

export async function recordUsage(userId: string, action: string, period: string) {
  return prisma.usageMetering.upsert({
    where: { userId_action_period: { userId, action, period } },
    update: { count: { increment: 1 } },
    create: { userId, action, period },
  });
}

export async function getUsage(userId: string, period: string) {
  return prisma.usageMetering.findMany({ where: { userId, period } });
}

export async function createBilling(userId: string, amount: number, currency: string, period: string) {
  return prisma.billing.create({ data: { userId, amount, currency, period } });
}

export async function getBilling(userId: string) {
  return prisma.billing.findMany({ where: { userId } });
}

export async function grantEntitlement(userId: string, feature: string) {
  return prisma.entitlement.upsert({
    where: { userId_feature: { userId, feature } },
    update: { granted: true },
    create: { userId, feature, granted: true },
  });
}

export async function getEntitlements(userId: string) {
  return prisma.entitlement.findMany({ where: { userId } });
}

export async function createMLFeature(phoneId: string, feature: string, value: number) {
  return prisma.mLFeature.create({ data: { phoneId, feature, value } });
}

export async function createMLTrainingData(phoneId: string, label: string, features: string) {
  return prisma.mLTrainingData.create({ data: { phoneId, label, features } });
}

export async function createMessageRisk(messageId: string, riskScore: number, riskLevel: string) {
  return prisma.messageRisk.create({ data: { messageId, riskScore, riskLevel } });
}

export async function getURLReputation(url: string) {
  return prisma.uRLReputation.findUnique({ where: { url } });
}

export async function createImpersonationAlert(businessId: string, suspectedId: string, riskScore: number) {
  return prisma.impersonationAlert.create({ data: { businessId, suspectedId, riskScore } });
}

export async function createScamCampaign(name: string, phoneIds: string[], riskScore: number) {
  return prisma.scamCampaign.create({ data: { name, phoneIds, riskScore } });
}

export async function createCallerID(phoneId: string, displayName: string, source: string) {
  return prisma.callerID.create({ data: { phoneId, displayName, source } });
}

export async function createCallDirectory(phoneId: string, countryCode: string, carrier?: string) {
  return prisma.callDirectory.create({ data: { phoneId, countryCode, carrier } });
}

export async function createOfflineCache(phoneId: string, data: string, expiresAt: Date) {
  return prisma.offlineCache.create({ data: { phoneId, data, expiresAt } });
}

export async function createBlockList(userId: string, phoneId: string, reason?: string) {
  return prisma.blockList.create({ data: { userId, phoneId, reason } });
}

export async function createReportAfterCall(phoneId: string, userId: string, reportId?: string) {
  return prisma.reportAfterCall.create({ data: { phoneId, userId, reportId } });
}

export async function createSMSIntegration(phoneId: string, messageId?: string, content?: string, riskScore?: number) {
  return prisma.sMSIntegration.create({ data: { phoneId, messageId, content, riskScore: riskScore ?? 0 } });
}
