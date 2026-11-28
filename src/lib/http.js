const json = (statusCode, payload) => ({
  statusCode,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(payload),
});

const noContent = () => ({ statusCode: 204 });

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const handler = (fn) => async (event) => {
  try {
    return await fn(event);
  } catch (error) {
    const statusCode = error.statusCode || 500;

    if (statusCode === 500) console.error(error);

    return json(statusCode, { error: statusCode === 500 ? 'internal error' : error.message });
  }
};

module.exports = { json, noContent, httpError, handler };
