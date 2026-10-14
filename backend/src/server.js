// server.js — starts the backend. Settings come from backend/.env (see .env.example).
'use strict';
const { connect } = require('./db');
const { createApp } = require('./app');

const PORT = Number(process.env.PORT || 3010);
const PUBLIC_URL = (process.env.PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/$/, '');

async function main() {
  const { client, documents } = await connect(process.env.MONGO_URL, process.env.MONGO_DB);
  console.log(`Connected to MongoDB: ${process.env.MONGO_DB}`);

  const app = createApp({ documents, publicUrl: PUBLIC_URL });
  const server = app.listen(PORT, () => console.log(`Maqra backend running on ${PUBLIC_URL}`));

  const stop = async () => {
    server.close();
    await client.close();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((err) => {
  console.error('Could not connect to MongoDB:', err.message);
  console.error('Is the database running? Try: docker compose up -d');
  process.exit(1);
});
