# Full Build TODO

## 0. Product / legal
- [ ] Define product name, countries and launch scope
- [ ] Threat model and abuse cases
- [ ] Privacy policy / terms / data retention
- [ ] Consent and lawful processing model
- [ ] Number owner correction/removal workflow
- [ ] Business verification policy
- [ ] Appeals and moderation policy
- [ ] Security incident response plan

## 1. Foundation
- [x] pnpm + Turborepo monorepo
- [x] PostgreSQL + Redis compose
- [x] Shared TypeScript packages
- [x] Phone normalization package
- [x] Reputation engine scaffold
- [x] Fastify API scaffold
- [ ] Auth service
- [ ] Observability
- [ ] Error tracking
- [ ] CI/CD

## 2. Data layer
- [x] User
- [x] PhoneNumber
- [x] Report
- [x] Business
- [ ] Identity claims
- [ ] Number aliases
- [ ] Country/carrier metadata
- [ ] Verification records
- [ ] Audit events
- [ ] Data deletion records
- [ ] Database indexes and partition strategy
- [ ] Encryption/key management

## 3. Caller ID MVP
- [ ] Android integration
- [ ] iOS Call Directory integration
- [ ] Local cache
- [ ] Cache invalidation
- [ ] Fast lookup API
- [ ] Offline behavior
- [ ] Caller UI
- [ ] Report-after-call flow
- [ ] Block flow

## 4. Search
- [ ] E.164 normalization everywhere
- [ ] Exact lookup
- [ ] Fuzzy name search
- [ ] Business search
- [ ] Search ranking
- [ ] OpenSearch/Elasticsearch index
- [ ] Abuse/rate limiting
- [ ] Search privacy controls

## 5. Reputation
- [ ] Report deduplication
- [ ] Unique reporter weighting
- [ ] Reporter trust score
- [ ] Recency decay
- [ ] Category confidence
- [ ] Verified business adjustment
- [ ] Risk bands
- [ ] Reputation history
- [ ] Async recomputation
- [ ] Human moderation override

## 6. Community
- [ ] Report categories
- [ ] Report reason
- [ ] User feedback
- [ ] False-positive feedback
- [ ] Abuse detection
- [ ] Reporter reputation
- [ ] Appeals
- [ ] Content moderation

## 7. Business identity
- [ ] Business onboarding
- [ ] Phone verification
- [ ] Domain verification
- [ ] Document verification where lawful
- [ ] Verified badge
- [ ] Business logo
- [ ] Business category
- [ ] Business hours
- [ ] Business analytics
- [ ] Business API

## 8. SMS / fraud
- [ ] Android SMS integration where permitted
- [ ] Message risk classifier
- [ ] URL extraction
- [ ] URL reputation
- [ ] Impersonation detection
- [ ] Scam campaign clustering
- [ ] User warning UX
- [ ] False-positive handling

## 9. ML
- [ ] Feature pipeline
- [ ] Training dataset
- [ ] Label quality system
- [ ] Baseline logistic model
- [ ] Gradient boosting model
- [ ] Calibration
- [ ] Offline evaluation
- [ ] Drift monitoring
- [ ] Model versioning
- [ ] Explainable risk signals
- [ ] Human review loop

## 10. Admin
- [ ] Dashboard
- [ ] Number search
- [ ] Report queue
- [ ] Business verification queue
- [ ] Appeals
- [ ] User abuse
- [ ] Risk overrides
- [ ] Audit logs
- [ ] Role-based access
- [ ] Two-factor authentication

## 11. Security
- [ ] API authentication
- [ ] Authorization
- [ ] Rate limiting
- [ ] Bot protection
- [ ] Enumeration resistance
- [ ] Secrets management
- [ ] Encryption at rest
- [ ] TLS everywhere
- [ ] Audit logging
- [ ] Dependency scanning
- [ ] SAST/DAST
- [ ] Penetration testing

## 12. Scale
- [ ] Redis cache
- [ ] Read replicas
- [ ] Queue
- [ ] Search cluster
- [ ] Worker autoscaling
- [ ] Database partitioning
- [ ] CDN
- [ ] Regional deployment strategy
- [ ] Load tests
- [ ] Disaster recovery

## 13. Monetization
- [ ] Free tier
- [ ] Premium
- [ ] Business subscription
- [ ] API pricing
- [ ] Usage metering
- [ ] Billing
- [ ] Entitlements

## 14. Quality
- [ ] Unit tests
- [ ] Integration tests
- [ ] API contract tests
- [ ] Android tests
- [ ] iOS tests
- [ ] E2E tests
- [ ] Load tests
- [ ] Security tests
- [ ] Privacy tests

## 15. Launch
- [ ] Closed beta
- [ ] Seed trusted number dataset
- [ ] Monitor false positives
- [ ] Monitor lookup latency
- [ ] Abuse monitoring
- [ ] App-store compliance
- [ ] Production runbook
- [ ] Rollback plan
- [ ] Public launch
