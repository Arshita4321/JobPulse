# JobPulse — Resilient Job Listing Ingestion Pipeline

JobPulse is a production-ready, highly resilient Node.js & React web application that periodically retrieves job listings from a public RSS/API feed, processes them through a multi-layered validation and deduplication pipeline, and persists them in MySQL. 

The primary goal of this project is to showcase **ingestion resilience**—how an automated ingestion pipeline handles rate limits (HTTP 429), server crashes (HTTP 5xx), slow network connections, validation anomalies, database constraints, and source schema shifts gracefully without crashing or flooding servers.

---

## 1. System Architecture

```text
                     PUBLIC JOB SOURCE
                       RSS / PUBLIC API
                              |
                              v
                     +------------------+
                     |  Source Adapter  |
                     +--------+---------+
                              |
                              v
                     +------------------+
                     |   Rate Limiter   |
                     +--------+---------+
                              |
                              v
                     +------------------+
                     |      Fetch       |
                     +--------+---------+
                              |
                    +----------+----------+
                    |                     |
                 SUCCESS                FAILURE
                    |                     |
                    v                     v
               +---------+          +-----------+
               |  Parse  |          |   Retry   |
               +----+----+          +-----+-----+
                    |                     |
                    v               Exponential
               +---------+            Backoff
               | Validate|                |
               +----+----+                v
                    |              Max retries?
                    v                   |
               +---------+        +------+------+
               |Normalize|        |             |
               +----+----+       NO            YES
                    |             |             |
                    v             |             v
               +---------+        |       Circuit Breaker
               | Dedup   |        |             |
               +----+----+        |             v
               |         |        |       Mark unhealthy
               v         v        v
               +----------+       |
               |  MySQL   | <-----+
               +----+-----+
                    |
                    v
               +----------+
               | Express  |
               | REST API |
               +----+-----+
                    |
                    v
               +----------+
               | React UI |
               +----------+
```

### Key Component Separation:
- **Source Adapters**: Handles raw fetching and parsing for specific endpoints (RSS feed or Sandbox endpoint). Exposes `name`, `fetchJobs()`, and `parseJobs()`.
- **Ingestion Engine**: Orchestrates the workflow, managing rate limit pacing, retry execution, validation checks, normalization, and deduplication.
- **Resilience Services**:
  - `rateLimiter.js`: Paces requests to respect server boundaries.
  - `retryService.js`: Retries transient errors (429, 5xx, timeouts) using exponential backoff, jitter, and `Retry-After`.
  - `circuitBreaker.js`: Handles `CLOSED`, `OPEN`, and `HALF_OPEN` states to avoid hitting dead or degraded servers.
  - `validationService.js`: Rejects records missing key fields (`title`, `company`, `url`, `externalId`, `source`).
  - `sourceHealthService.js`: Tracks latency, failures, and circuit state metrics.
- **Repositories**: Standard SQL data-access queries separated from business/scheduler components.

---

## 2. Ingestion Resilience & Failure Scenarios

### Scenario 1: Source Returns HTTP 429
If the source returns a `429 Too Many Requests` response:
1. The retry service halts regular request flow.
2. It parses the `Retry-After` header if provided by the server.
3. If valid, the system pauses execution for the requested period (e.g. 2 seconds) before retrying.
4. If failures persist, the circuit breaker opens.

### Scenario 2: Source Returns HTTP 5xx
For transient server errors (500, 502, 503, 504), the pipeline automatically retries the operation using **exponential backoff** (`base * 2^attempt`) with small randomized **jitter** to prevent thundering herd problems.

### Scenario 3: Request Timeouts
Each request is wrapped with an `AbortController` timeout (e.g., 10,000ms). If a fetch hangs, it is aborted, logged, and treated as a retryable transient failure.

### Scenario 4: Repeated Failure (Circuit Opens)
If failures meet the threshold (default: 3 consecutive failures), the circuit transitions to **OPEN**. Requests to the source are temporarily blocked. After the cooldown period (default: 60 seconds), it transitions to **HALF_OPEN** to test server recovery.

### Scenario 5: Duplicate Ingestion
Deduplication is performed using a `content_hash` of structural job fields combined with a unique database constraint on `(source, external_id)`. If a duplicate is found, the `last_seen_at` date updates without writing duplicate rows.

### Scenario 6: Malformed Record
If a job is missing required structural elements, the validation service rejects the record, increments the failed record count, and proceeds with the rest of the batch.

### Scenario 7: Schema-Change Guard
If the remote XML feed updates its key layout (e.g., using `jobTitle` instead of `title`), the parser/validation service detects the missing structural fields, rejects the batch, and updates source health to `DEGRADED`/`OPEN` to protect the database from pollution.

---

## 3. Detection Surface & Bot Boundaries

### What specifically gives an automated client away?
Websites use several key signals on their perimeter to detect and identify automated scrapers and bots:

```text
Automated-client detection signals
│
├── Request frequency (High volumes in short durations)
├── Burst behavior (Spiky connection pools rather than human mouse movements)
├── Missing/abnormal HTTP headers (Absent User-Agent, Accept, or host indicators)
├── Repeated identical request patterns (Identical route traversals at rigid clock times)
├── Session/cookie behavior (Lack of cookie persistence or cookie processing)
├── TLS/network fingerprints (TLS version, cipher suites, or TCP/IP window sizes)
├── Browser/headless fingerprints (WebDriver presence, user-agent/navigator mismatches)
├── CAPTCHA challenges (Triggers when heuristic behavior looks abnormal)
└── IP reputation/rate limiting (Known hosting ranges or datacenter subnets)
```

### Ingestion Philosophy & Guardrails
- **No Evasion**: **JobPulse deliberately does not attempt to bypass CAPTCHA, fingerprinting, access controls, or bot protections.** 
- **Respectful Ingestion**: Instead of evading detection, **JobPulse uses respectful pacing, bounded retries, server-provided Retry-After handling, and circuit breaking to avoid unnecessarily stressing a source.**
- **Why this Source?**: The WeWorkRemotely public RSS feed was selected because the assignment explicitly permits a public job-board RSS/API source, and the goal is to demonstrate ingestion resilience without attempting to circumvent authentication, CAPTCHA, or anti-bot protections on platforms such as LinkedIn or Indeed.
- **Where I Stop**: JobPulse does not attempt to bypass CAPTCHA, authentication, fingerprinting defenses, robots/access controls, or other anti-bot mechanisms. If a source blocks requests, the system backs off, opens its circuit, records the failure, and falls back to another permitted source/adapter rather than escalating the scraping technique.

---

## 4. Fallback Strategy (Plan B)

If the primary WeWorkRemotely RSS feed blocks requests or undergoes a breaking schema change, JobPulse relies on a modular, multi-source fallback approach:

```text
Primary RSS Source (WeWorkRemotely)
               │
               ▼ (Blocks / Fails / Circuit Trips)
        Circuit OPEN
               │
               ▼
   Fallback to Secondary RSS/API Adapter (e.g. RemoteOK RSS or StackOverflow API)
               │
               ▼ (All Sources Open)
   Fallback to Local Database Cache (Serve stale listings with warning banner)
```

Because JobPulse is built around a structured adapter interface, new adapters conforming to the same interface can be added to the engine registry without altering any core logic. When the primary adapter fails, the scheduler can iterate down the registry to query alternative permitted public endpoints.

---

## 5. Local Setup & Installation

### Environment Variables (.env)
Create a `.env` file in `/backend` using these parameters:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=jobpulse
PRIMARY_SOURCE_URL=https://weworkremotely.com/remote-jobs.rss
PRIMARY_SOURCE_NAME=weworkremotely
REQUEST_TIMEOUT_MS=10000
REQUEST_DELAY_MS=2000
MAX_RETRIES=3
BACKOFF_BASE_MS=1000
CIRCUIT_FAILURE_THRESHOLD=3
CIRCUIT_COOLDOWN_MS=60000
INGESTION_INTERVAL_MINUTES=5
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### Database Initialization
Ensure MySQL is running locally, create a database named `jobpulse` (e.g. `CREATE DATABASE jobpulse;`), and run:
```bash
cd backend
node src/db/init.js
```

### Running Backend
```bash
cd backend
npm install
npm start
```

### Running Frontend
```bash
cd frontend
npm install
npm run dev
```

### Running Tests
Execute Node's built-in test runner:
```bash
cd backend
npm test
```
