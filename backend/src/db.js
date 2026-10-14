// db.js — opens the MongoDB connection and prepares the collections.
'use strict';
const { MongoClient } = require('mongodb');

async function connect(url, dbName) {
  const client = new MongoClient(url, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const db = client.db(dbName);
  await db.command({ ping: 1 });

  const documents = db.collection('documents');
  await documents.createIndex({ createdAt: -1 });

  return { client, documents };
}

module.exports = { connect };
