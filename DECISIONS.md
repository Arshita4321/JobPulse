# Architecture Decisions — JobPulse

## 1. Why this Ingestion Strategy?
Rather than developing fragile web scrapers that attempt to bypass access-control layers (CAPTCHA, Cloudflare, IP blocks) on commercial job boards like LinkedIn or Indeed, we chose a structured, adapter-based ingestion strategy targeting a **legitimate, public RSS/API source** alongside a **predefined simulator sandbox**.

### Key Advantages:
- **Low Operational Risk**: Eliminates the risk of IP bans, legal actions, and continuous maintenance churn caused by UI structure changes on third-party sites.
- **Reliability & Reproducibility**: Public feeds (like WeWorkRemotely RSS) provide stable, semantic XML/JSON outputs, making tests and production ingestion predictable.
- **Source Abstraction**: The adapter contract ensures the ingestion engine remains source-agnostic. Adding a new public API endpoint simply requires writing a new adapter mapping output keys to the common internal job format.

---

## 2. Technical Trade-Off: In-Process Scheduler vs. Distributed Queues
Under the development time constraint, we implemented an in-process scheduler (`node-cron`) rather than introducing a full-scale distributed message broker (e.g. BullMQ, Redis, or Kafka).

### Implications:
- **Scalability Limit**: In-process schedulers execute inside the web server process. If we scale the web app horizontally on multiple server instances (e.g., in a production Kubernetes cluster), each server instance would run its own cron trigger, resulting in duplicate fetches unless an external lock is used.
- **Production recommendation**: For a large-scale setup, we would decouple the scheduler from the API, introducing a persistent task queue (e.g. BullMQ with Redis) to distribute ingestion jobs to dedicated worker threads.

---

## 3. AI Usage & Verification Statement
- **AI Support**: AI was utilized solely as a helper assistant during development. It assisted by helping debug errors, fixing bugs, and suggesting codebase improvements.
- **Human Verification**: All code, suggestions, and modifications proposed by the AI went through thorough manual review and human verification. Every line of code, database index, retry equation, and circuit breaker transition state was verified, tested, and passed human validation before integration.

---

## 4. Database Selection
I selected MySQL because it was sufficient for the relational persistence requirements and allowed me to keep the database layer familiar and lightweight. The ingestion architecture remains database-agnostic through the repository layer.

