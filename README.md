# JobPulse — Resilient Job Listing Ingestion Pipeline

JobPulse is a resilient job-listing ingestion pipeline built with Node.js, React, and MySQL. It demonstrates production-minded ingestion patterns including bounded retries, rate limiting, circuit breaking, validation, and deduplication.

The primary goal of this project is to showcase **ingestion resilience**—how an automated ingestion pipeline handles rate limits (HTTP 429), server crashes (HTTP 5xx), slow network connections, validation anomalies, database constraints, and source schema shifts gracefully without crashing or flooding servers.

---

## 1. System Architecture

```text
                 Source Adapter
                      |
                      v
                Circuit Breaker  <------- If OPEN, halts run immediately
                      |                   without querying rate limiter or server
                      v
                 Rate Limiter
                      |
                      v
                    Fetch
                   /     \
              success    failure
                 |          |
                 v          v
               Parse      Retry  <------- Executes up to 3 retries (4 total attempts)
                 |          |             using exponential backoff and jitter
                 v          |
              Validate <----+
                 |
                 v
              Normalize
                 |
                 v
               Dedup
                 |
                 v
               MySQL
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
3. If valid, the system pauses execution and **waits at least the requested duration** before retrying.
4. If failures persist, the circuit breaker opens.

### Scenario 2: Source Returns HTTP 5xx
For transient server errors (500, 502, 503, 504), the pipeline automatically retries the operation using **exponential backoff** (`base * 2^attempt`) with small randomized **jitter** to prevent thundering herd problems.

### Scenario 3: Request Timeouts
Each request is wrapped with an `AbortController` timeout (e.g., 10,000ms). If a fetch hangs, it is aborted, logged, and treated as a retryable transient failure.

### Scenario 4: Repeated Failure (Circuit Opens)
- **`MAX_RETRIES` Configuration**: `MAX_RETRIES=3` means that up to **3 retries** are executed after the initial attempt fails, resulting in up to **4 total HTTP attempts** per ingestion run.
- **Circuit Breaker Counting**: The failure threshold of 3 counts **failed ingestion runs** (i.e., runs where all 4 attempts failed), rather than individual HTTP attempts.
- **Circuit Trip**: If 3 consecutive runs fail, the circuit transitions to **OPEN**. Requests to the source are temporarily blocked. After the cooldown period (default: 60 seconds), it transitions to **HALF_OPEN** to test server recovery.

### Scenario 5: Duplicate Ingestion & Hash Checking
- **`source` + `external_id`**: Identifies whether a listing has already been ingested.
- **`content_hash`**: Calculated using specific job fields: `title`, `company`, `description`, and `link` (url). If the job exists, the engine compares its new content hash to the stored hash. If they match, it simply updates `last_seen_at`. If the content has changed (e.g., an updated description), it updates the database columns and sets `updated_at`.

### Scenario 6: Malformed Record (Batch Continuation)
If a single job in a batch is missing required structural elements, the validation service logs a warning, rejects only that record (incrementing `failed_count`), and continues parsing the remaining valid listings in the batch.

### Scenario 7: Schema-Change Guard (Feed-Wide Failure)
If the remote XML feed changes entirely (e.g. key elements disappear, yielding a parse failure or 0 valid listings), the parser throws an exception. This is treated as a feed-wide service degradation, which triggers a circuit breaker failure, protecting the database from batch processing corrupt structures.

---

## 3. Detection Surface & Bot Boundaries

### What specifically gives an automated client away?
Websites use several key signals on their perimeter to detect and identify automated scrapers and bots:

```text
Automated-client detection signals
│
├── Request frequency (High volumes in short durations)
├── Burst behavior (Rapid repeated requests rather than normal human pacing)
├── Missing/abnormal HTTP headers (Absent User-Agent, Accept, or host indicators)
├── Repeated identical request patterns (Identical route traversals at rigid clock times)
├── Session/cookie behavior (Lack of cookie persistence or cookie processing)
├── TLS/network fingerprints (TLS version, cipher suites, or TCP/IP window sizes)
├── Browser/headless fingerprints (WebDriver presence, navigator mismatches)
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
   Iterate to Next Registered Adapter (e.g. secondary permitted API/RSS sources)
               │
               ▼ (All Sources Open)
   Serve Cached Dataset (Serve last known listings stored in local MySQL)
```

- **Adapter Fallback**: The adapter architecture allows a secondary permitted RSS/API source to be registered without modifying the ingestion engine. For the submitted demo, WeWorkRemotely is the only live external source.
- **Offline Cache**: Previously ingested listings remain available in MySQL, allowing the UI to continue showing the last known dataset while live synchronization is unavailable.

---

## 5. Live Demo Flow

To demonstrate the resilience mechanics in action:
1. **Normal Ingestion**: Trigger a run for `public-rss`. Confirm 100 jobs are loaded.
2. **Duplicate Detection**: Run the same ingestion. Confirm `New=0, Duplicates=100` shows correct DB tracking.
3. **HTTP 429 Simulation**: Trigger the `429 Rate Limit` scenario. Observe pacing wait using the `Retry-After` header.
4. **HTTP 503 Outage**: Trigger the `503 Outage` scenario. Observe retries using backoff and jitter.
5. **Circuit Tripping**: Run `Repeated Failures`. After the 3rd failure, verify the circuit turns **OPEN** on the **Source Health** page.
6. **Recovery**: Wait for the cooldown period. Trigger a simulation and observe state recovery to **CLOSED**.
7. **Schema Mismatch**: Run `Schema Change` and confirm corrupt structures are safely rejected without polluting database tables.

---

## 6. Production Limitations

The submitted implementation intentionally keeps the architecture lightweight for demo simplicity:
- **In-process Scheduler**: Relies on `node-cron`. Horizontal scaling would require an external distributed queue (like BullMQ + Redis) and distributed locking.
- **Single Live Feed**: Relies on a single live source. Additional source adapters would need to be added to the registry for active production failover.
- **Centralized Observability**: Production deployments would use centralized logging (e.g., Winston, ELK) and metrics alerts instead of in-database status tables.

---

## 7. Local Setup & Installation

### Environment Variables (.env)
Create a `.env` file in `/backend` using these parameters:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=jobpulse
DB_SSL_CA=                       # Path to Aiven CA cert file (Mandatory in production)
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
