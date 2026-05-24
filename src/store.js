import { randomUUID } from 'node:crypto';

const db = {
  leads: [],
  demos: [],
  customRequests: [],
  newsletter: [],
};

export function insert(table, payload) {
  const record = { id: randomUUID(), createdAt: new Date().toISOString(), ...payload };
  db[table].push(record);
  return record;
}

export function list(table) {
  return db[table];
}
