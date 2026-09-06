# Shared chicken crossing

The shared persisted schedule stops the car after five minutes of driving. The next five-minute timer starts only when the light turns green after the last chicken exits. Four-second smooth braking and acceleration preserve continuous forward travel. Studio preview remains independent. Clicks during a crossing join the next crossing. If the server is temporarily unavailable at a light, clients wait safely rather than replaying an old flock.

Clicks are buffered in the tab, sent as cumulative totals at most once every 10–11 seconds, and retried without double counting. Unsent clicks are explicitly shown; closing the tab or missing the cutoff can lose pending clicks. The database is authoritative. Anonymous users may participate.

Storage is one indexed aggregate row per session per round, not one row per click. Each accepted batch adds at most 200; there is no longer a per-session flock cap. A hashed, round-scoped Cloudflare client IP limits accepted batches to one per ten seconds; people sharing a network share this limit. The route fails closed if the edge address is unavailable in production. Old rounds and rate records are pruned in bounded chunks on writes, retaining the current and previous crossing. Raw IP addresses are not stored.

Read snapshots use Cloudflare's per-location Cache API for five seconds, bypassed at a stop boundary. One atomic SQL update freezes the count and advances the event. Each event owns its count and timestamps, eliminating the previous stale-count flash on a new clock cycle. A small lead-in gives clients time to receive the event.

Every accepted chicken crosses left to right at eight chickens per second, with a ten-second off-screen-to-off-screen transit. There is no representative-flock cap. Index arithmetic selects only the active time window, and frustum checks skip off-screen animals. The reusable instance pool is sized from transit time and spacing (81 slots), independent of whether the queue contains 1 or 1,000,000 chickens. Finished chickens are never looped or clamped at the exit. The remaining count decrements as chickens exit. At this steady rate a million chickens takes about 34.7 hours; the car waits for the whole flock.

## Capacity caveat

This is a bounded D1 implementation, not a load-tested internet-scale service. For 1,000 continuously clicking tabs, client batching produces roughly 100 writes/second rather than one request per click. Each accepted request still executes multiple SQL statements and D1 is a single-writer database. HTTP floods still reach the Worker and rate-limit query, and rotating IP addresses can evade IP limits. Configure ingress/WAF rate limiting and bot protection before promotion. Cache misses across locations still query D1.

Before committing to thousands of sustained concurrent clickers, load-test the actual hosted plan, including p95 latency, database overload, cache hit rate, retry storms, and costs. At larger scale move ingestion to partitioned Durable Objects or a queue/Redis aggregator, broadcast sampled totals, and persist periodic rollups to D1. That infrastructure is not currently provisioned by this Sites project. Existing chat and presence polling also need to be included in the load test.

Publishing remains blocked by the earlier uncertain migration ledger boundary (`repository_world_cache` already exists). Migration history has not been rewritten or bypassed. Platform repair is needed before applying the new append-only migrations.
