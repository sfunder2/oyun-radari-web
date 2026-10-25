# Sprint 03 performance benchmark

Run `node scripts/benchmark-pricing.mjs` to obtain a network-free, repeatable
baseline for Steam and Epic price parsing on the current runtime.

Compare runs using the same runner and Node version. This microbenchmark
does **not** measure real API latency, database queries, network calls, visual
loading or user-perceived performance; do not infer those from these numbers.

## Production follow-up
- Measure p50/p95 regional-price Edge Function timings.
- Track memory use, cache hit ratio and concurrent request coalescing.
- Measure image transfer sizes and Core Web Vitals (LCP, INP, CLS).
- Analyze Supabase query plans before adding or dropping indexes.
- Set thresholds based on the captured production baseline.
