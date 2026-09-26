# Production Runbook

## Deployment
1. Merge PR to main
2. CI/CD pipeline runs tests and builds
3. Deploy to staging for smoke tests
4. Deploy to production
5. Run smoke tests against production
6. Monitor error rates and latency

## Monitoring
- Error rate: Alert if > 1%
- Latency p99: Alert if > 500ms
- Redis: Alert if memory > 80%
- PostgreSQL: Alert if connections > 80%
- Disk: Alert if > 90%

## Incident Response
1. Identify issue
2. Escalate to on-call engineer
3. Apply fix or rollback
4. Post-incident review

## Rollback
1. Identify bad deployment
2. Rollback to previous version
3. Verify application health
4. Investigate root cause
