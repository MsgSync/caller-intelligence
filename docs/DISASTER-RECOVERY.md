# Disaster Recovery Plan

## Recovery Objectives
- RTO: 4 hours
- RPO: 1 hour

## Backup Strategy
- PostgreSQL: Daily full backup + WAL archiving every 5 minutes
- Redis: RDB snapshots every 15 minutes
- Application: Git-based deployment with rollback capability

## Recovery Procedures

### Database Failure
1. Stop application servers
2. Restore latest full backup from S3
3. Replay WAL archives to point of failure
4. Start application servers
5. Verify data integrity

### Redis Failure
1. Restart Redis instance
2. If persistent failure, restore from RDB snapshot
3. Rebuild cache from database

### Application Failure
1. Rollback to last known good deployment
2. Run database migrations if needed
3. Restart application servers
4. Verify health endpoints

### Regional Failure
1. Deploy to secondary region
2. Promote read replica to primary
3. Update DNS to secondary region
4. Verify application health

## Testing Schedule
- Monthly: Backup restoration test
- Quarterly: Full DR drill
- Annually: Business continuity review
