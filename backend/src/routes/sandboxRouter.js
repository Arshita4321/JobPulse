import express from 'express';

export const sandboxRouter = express.Router();

// Helper to delay response
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

sandboxRouter.get('/source', async (req, res) => {
  const scenario = req.query.scenario || 'normal';

  // Security: only allow whitelisted scenarios
  const allowedScenarios = ['normal', '429', '503', 'timeout', 'malformed', 'repeated-failure', 'recovery', 'schema-change'];
  if (!allowedScenarios.includes(scenario)) {
    return res.status(400).send('Invalid simulation scenario');
  }

  console.log(`[SANDBOX] Simulating scenario=${scenario}`);

  if (scenario === '429') {
    res.set('Retry-After', '2');
    return res.status(429).send('Too Many Requests (Simulated)');
  }

  if (scenario === '503') {
    return res.status(503).send('Service Unavailable (Simulated)');
  }

  if (scenario === 'repeated-failure') {
    return res.status(500).send('Internal Server Error (Simulated)');
  }

  if (scenario === 'timeout') {
    // Deliberately delay response to trigger Client/Abort timeout (e.g. 15 seconds)
    await delay(15000);
    return res.status(200).send('<rss><channel><title>Timeout</title></channel></rss>');
  }

  // Set XML response header
  res.type('application/xml');

  if (scenario === 'malformed') {
    return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Sandbox Jobs - Malformed</title>
    <link>http://localhost/sandbox</link>
    <description>Simulated RSS Feed</description>
    <item>
      <title></title> <!-- Missing title -->
      <company>Google</company>
      <link>https://jobs.google.com/1</link>
      <pubDate>Tue, 18 Aug 2026 10:00:00 +0000</pubDate>
    </item>
    <item>
      <title>Software Engineer</title>
      <company></company> <!-- Missing company -->
      <link>https://jobs.google.com/2</link>
      <pubDate>Tue, 18 Aug 2026 11:00:00 +0000</pubDate>
    </item>
  </channel>
</rss>`);
  }

  if (scenario === 'schema-change') {
    // Simulates schema change with unexpected tag names
    return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel schemaVersion="legacy-v1">
    <title>Sandbox Jobs - Schema Change</title>
    <link>http://localhost/sandbox</link>
    <description>Simulated RSS Feed</description>
    <item>
      <jobTitle>AI Developer</jobTitle> <!-- Unexpected element -->
      <organization>OpenAI</organization> <!-- Unexpected element -->
      <jobUrl>https://openai.com/jobs/1</jobUrl> <!-- Unexpected element -->
      <guid>https://openai.com/jobs/1</guid>
      <pubDate>Tue, 18 Aug 2026 12:00:00 +0000</pubDate>
    </item>
  </channel>
</rss>`);
  }

  // normal, recovery, and other cases default to normal output
  const uniqueTime = Date.now();
  return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Sandbox Jobs - Normal</title>
    <link>http://localhost/sandbox</link>
    <description>Simulated RSS Feed</description>
    <item>
      <title>React Frontend Engineer</title>
      <company>JobPulse Inc</company>
      <link>https://jobpulse.dev/jobs/frontend-${uniqueTime}</link>
      <pubDate>Tue, 18 Aug 2026 08:00:00 +0000</pubDate>
      <location>Remote (US)</location>
      <description>Build interactive interfaces with React and Vite.</description>
    </item>
    <item>
      <title>Backend System Engineer</title>
      <company>JobPulse Inc</company>
      <link>https://jobpulse.dev/jobs/backend-${uniqueTime}</link>
      <pubDate>Tue, 18 Aug 2026 09:00:00 +0000</pubDate>
      <location>Remote (Europe)</location>
      <description>Build resilient server-side pipelines with Node.js and Express.</description>
    </item>
  </channel>
</rss>`);
});
