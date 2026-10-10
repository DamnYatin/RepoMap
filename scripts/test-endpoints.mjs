const endpoints = [
  { name: 'Cached fastify', url: 'http://localhost:3000/api/analyze', body: { url: 'https://github.com/fastify/fastify' } },
  { name: 'Cached morgan', url: 'http://localhost:3000/api/analyze', body: { url: 'https://github.com/expressjs/morgan' } },
  { name: 'Cached flask', url: 'http://localhost:3000/api/analyze', body: { url: 'https://github.com/pallets/flask' } },
  { name: 'Explain file', url: 'http://localhost:3000/api/explain', body: { url: 'https://github.com/fastify/fastify', path: 'lib/fastify.js' } },
  { name: 'Quiz generation', url: 'http://localhost:3000/api/quiz', body: { url: 'https://github.com/fastify/fastify' } },
  { name: 'Ask repository Q&A', url: 'http://localhost:3000/api/ask', body: { url: 'https://github.com/fastify/fastify', question: 'What is the main purpose?' } },
  { name: 'Invalid URL error test', url: 'http://localhost:3000/api/analyze', body: { url: 'invalid-url-here' } },
];

async function run() {
  console.log('Testing RepoMap API Endpoints:\n');
  for (const ep of endpoints) {
    const start = performance.now();
    try {
      const res = await fetch(ep.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ep.body),
      });
      const duration = (performance.now() - start).toFixed(1);
      const text = await res.text();
      let isSuccess = res.ok;
      if (ep.name.includes('Invalid URL') && text.includes('INVALID_URL')) {
        isSuccess = true;
      }
      const preview = text.substring(0, 100).replace(/\n/g, ' ');
      console.log(`${isSuccess ? '✓' : '✗'} [${res.status}] ${ep.name} — ${duration}ms | ${preview}`);
    } catch (err) {
      console.error(`✗ Error calling ${ep.name}:`, err.message);
    }
  }
}

run();
