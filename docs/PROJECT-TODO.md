# Full Build TODO

## 0. Product / legal
- [x] Define product name, countries and launch scope
- [x] Threat model and abuse cases
- [x] Privacy policy / terms / data retention
- [x] Consent and lawful processing model
- [x] Number owner correction/removal workflow
- [x] Business verification policy
- [x] Appeals and moderation policy
- [x] Security incident response plan

## 1. Foundation
- [x] pnpm + Turborepo monorepo
- [x] PostgreSQL + Redis compose
- [x] Shared TypeScript packages
- [x] Phone normalization package
- [x] Reputation engine scaffold
- [x] Fastify API scaffold
- [x] Auth service (JWT-based, register/login endpoints)
- [x] Observability (request logging, audit events)
- [x] Error tracking (error handler middleware)
- [x] CI/CD

## 2. Data layer
- [x] User
- [x] PhoneNumber
- [x] Report
- [x] Business
- [x] Identity claims
- [x] Number aliases
- [x] Country/carrier metadata
- [x] Verification records
- [x] Audit events
- [x] Data deletion records
- [x] Database indexes and partition strategy
- [x] Encryption/key management

## 3. Caller ID MVP
- [x] Android integration
- [x] iOS Call Directory integration
- [x] Local cache (Redis)
- [x] Cache invalidation
- [x] Fast lookup API
- [x] Offline behavior
- [x] Caller UI
- [x] Report-after-call flow
- [x] Block flow

## 4. Search
- [x] E.164 normalization everywhere
- [x] Exact lookup
- [x] Fuzzy name search
- [x] Business search
- [x] Search ranking
- [x] OpenSearch/Elasticsearch index
- [x] Abuse/rate limiting
- [x] Search privacy controls

## 5. Reputation
- [x] Report deduplication (processed flag)
- [x] Unique reporter weighting
- [x] Reporter trust score
- [x] Recency decay (7-day window)
- [x] Category confidence
- [x] Verified business adjustment
- [x] Risk bands (LOW/MEDIUM/HIGH)
- [x] Reputation history
- [x] Async recomputation (Redis queue + worker)
- [x] Human moderation override

## 6. Community
- [x] Report categories
- [x] Report reason
- [x] User feedback
- [x] False-positive feedback
- [x] Abuse detection
- [x] Reporter reputation
- [x] Appeals
- [x] Content moderation

## 7. Business identity
- [x] Business onboarding
- [x] Phone verification
- [x] Domain verification
- [x] Document verification where lawful
- [x] Verified badge
- [x] Business logo
- [x] Business category
- [x] Business hours
- [x] Business analytics
- [x] Business API

## 8. SMS / fraud
- [x] Android SMS integration where permitted
- [x] Message risk classifier
- [x] URL extraction
- [x] URL reputation
- [x] Impersonation detection
- [x] Scam campaign clustering
- [x] User warning UX
- [x] False-positive handling

## 9. ML
- [x] Feature pipeline
- [x] Training dataset
- [x] Label quality system
- [x] Baseline logistic model
- [x] Gradient boosting model
- [x] Calibration
- [x] Offline evaluation
- [x] Drift monitoring
- [x] Model versioning
- [x] Explainable risk signals
- [x] Human review loop

## 10. Admin
- [x] Dashboard
- [x] Number search
- [x] Report queue
- [x] Business verification queue
- [x] Appeals
- [x] User abuse
- [x] Risk overrides
- [x] Audit logs
- [x] Role-based access
- [x] Two-factor authentication

## 11. Security
- [x] API authentication (JWT)
- [x] Authorization
- [x] Rate limiting (30 req/min per IP)
- [x] Bot protection
- [x] Enumeration resistance
- [x] Secrets management
- [x] Encryption at rest
- [x] TLS everywhere
- [x] Audit logging
- [x] Dependency scanning
- [x] SAST/DAST
- [x] Penetration testing

## 12. Scale
- [x] Redis cache
- [x] Read replicas
- [x] Queue (Redis pub/sub)
- [x] Search cluster
- [x] Worker autoscaling
- [x] Database partitioning
- [x] CDN
- [x] Regional deployment strategy
- [x] Load tests
- [x] Disaster recovery

## 13. Monetization
- [x] Free tier
- [x] Premium
- [x] Business subscription
- [x] API pricing
- [x] Usage metering
- [x] Billing
- [x] Entitlements

## 14. Quality
- [x] Unit tests
- [x] Integration tests
- [x] API contract tests
- [x] Android tests
- [x] iOS tests
- [x] E2E tests
- [x] Load tests
- [x] Security tests
- [x] Privacy tests

## 15. Launch
- [x] Closed beta
- [x] Seed trusted number dataset
- [x] Monitor false positives
- [x] Monitor lookup latency
- [x] Abuse monitoring
- [x] App-store compliance
- [x] Production runbook
- [x] Rollback plan
- [x] Public launch
