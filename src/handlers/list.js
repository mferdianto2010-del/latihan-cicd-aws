const http = require('../lib/http');
const db = require('../lib/db');
const images = require('../lib/images');

exports.handler = http.handler(async (event) => {
  const id = event.pathParameters && event.pathParameters.id;

  if (!id) {
    const files = await Promise.all(
      (await db.list()).map(async ({ s3Key, ...item }) => ({ ...item, url: await images.presign(s3Key) }))
    );

    return http.json(200, { files });
  }

  if (!db.isId(id)) throw http.httpError(404, 'file not found');

  const found = await db.find(id);

  if (!found) throw http.httpError(404, 'file not found');

  const { s3Key, ...item } = found;

  return http.json(200, { ...item, url: await images.presign(s3Key) });
});
