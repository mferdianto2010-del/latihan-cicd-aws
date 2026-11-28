const crypto = require('node:crypto');
const http = require('../lib/http');
const db = require('../lib/db');
const images = require('../lib/images');

const parseBody = (event) => {
  try {
    return JSON.parse(event.body || '');
  } catch {
    throw http.httpError(400, 'body must be valid JSON');
  }
};

const readInput = (event) => {
  const body = parseBody(event);
  const name = String(body?.name ?? '').trim();

  if (name === '') throw http.httpError(400, 'name is required');

  return { name, contentType: String(body?.contentType ?? ''), data: String(body?.data ?? '') };
};

exports.handler = http.handler(async (event) => {
  const { name, contentType, data } = readInput(event);
  const { bytes, extension } = images.decode(contentType, data);
  const id = crypto.randomUUID();
  const s3Key = await images.put(`images/${id}.${extension}`, bytes, contentType);
  const stored = await db.insert({ id, name, contentType, size: bytes.length, s3Key });
  const { s3Key: storedKey, ...item } = stored;

  return http.json(201, { ...item, url: await images.presign(storedKey) });
});
