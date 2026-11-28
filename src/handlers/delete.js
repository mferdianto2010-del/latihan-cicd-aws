const http = require('../lib/http');
const db = require('../lib/db');
const images = require('../lib/images');

exports.handler = http.handler(async (event) => {
  const id = event.pathParameters && event.pathParameters.id;

  if (!id || !db.isId(id)) throw http.httpError(404, 'file not found');

  const s3Key = await db.remove(id);

  if (!s3Key) throw http.httpError(404, 'file not found');

  await images.remove(s3Key);

  return http.noContent();
});
