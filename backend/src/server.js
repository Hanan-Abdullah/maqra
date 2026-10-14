// server.js — starts the backend. Settings come from backend/.env (see .env.example).
"use strict";
const { MongoClient } = require("mongodb");

const MONGO_URL = process.env.MONGO_URL;
const MONGO_DB = process.env.MONGO_DB;

async function main() {
  const client = new MongoClient(MONGO_URL, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const db = client.db(MONGO_DB);
  await db.command({ ping: 1 });
  console.log(`Connected to MongoDB: ${MONGO_DB}`);
  await client.close();
}

main().catch((err) => {
  console.error("Could not connect to MongoDB:", err.message);
  console.error("Is the database running? Try: docker compose up -d");
  process.exit(1);
});
