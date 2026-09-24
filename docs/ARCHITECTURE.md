# Architecture

## Request path

Client -> API Gateway -> Auth -> Number Service -> Cache -> Database/Search -> Reputation.

## Async path

Report -> Queue -> Reputation Worker -> Aggregation -> Number Profile -> Cache invalidation.

## Principles

1. Normalize every number to E.164.
2. Prefer local cache for caller-ID latency.
3. Never treat one report as authoritative.
4. Keep identity claims separate from reputation.
5. Make corrections, deletion and appeals first-class.
6. Minimize sensitive data collection.
7. Protect lookup APIs against enumeration and scraping.
