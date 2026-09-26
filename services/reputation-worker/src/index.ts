import { prisma, findPhoneNumberByE164, getReportCount, getUniqueReporterCount, getRecentReportCount, markReportProcessed, getUnprocessedReports, getReportsForPhone, updatePhoneNumberReputation } from "@caller/database";
import { calculateSpamScore } from "@caller/reputation";
import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
const CHANNEL = "reputation:reports";

async function processReport(reportId: string) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { phone: true, reporter: true },
  });
  if (!report || !report.phone) return;

  const number = await findPhoneNumberByE164(report.phone.e164);
  if (!number) return;

  const reportCount = await getReportCount(number.id);
  const uniqueReporters = await getUniqueReporterCount(number.id);
  const recentReports = await getRecentReportCount(number.id);
  const reports = await getReportsForPhone(number.id) as { category: string }[];
  const trustedReports = reports.filter((r) => r.category === "SPAM" || r.category === "SCAM").length;

  const score = calculateSpamScore({
    reportCount, uniqueReporters: uniqueReporters.length, recentReports, trustedReports,
    verifiedBusiness: number.business?.verified ?? false,
  });

  const confidence = reportCount > 0 ? Math.min(100, (reportCount / 10) * 100) : 0;
  const riskLevel = score >= 70 ? "HIGH" : score >= 30 ? "MEDIUM" : "LOW";

  await updatePhoneNumberReputation(number.id, { spamScore: score, confidence, riskLevel });
  await redis.del(`profile:${number.e164}`);
  console.log(`Updated reputation for ${number.e164}: score=${score}, confidence=${confidence}, risk=${riskLevel}`);
}

async function main() {
  console.log("Reputation worker started. Listening for reports...");
  const subscriber = redis.duplicate();
  subscriber.subscribe(CHANNEL);
  subscriber.on("message", async (channel, message) => {
    if (channel === CHANNEL) {
      try {
        const { reportId } = JSON.parse(message);
        console.log(`Processing report ${reportId}`);
        await processReport(reportId);
        await markReportProcessed(reportId);
      } catch (err) {
        console.error("Failed to process report:", err);
      }
    }
  });

  const publisher = redis;
  setInterval(async () => {
    const pendingReports = await getUnprocessedReports();
    for (const report of pendingReports) {
      await publisher.publish(CHANNEL, JSON.stringify({ reportId: report.id }));
    }
  }, 5000);
}

main().catch(console.error);
