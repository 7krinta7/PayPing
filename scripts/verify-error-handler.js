// Verifies the centralised error handler. Mounts it on a minimal
// express app and triggers each branch (AppError, ValidationError,
// CastError, JWT, 404, body-too-large, generic) to confirm:
//
//   1. Correct HTTP status.
//   2. JSON shape `{ message }`.
//   3. 5xx responses include a `requestId`.

require('dotenv').config();
process.env.NODE_ENV = 'production';

const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const AppError = require('../utils/AppError');
const errorHandler = require('../middleware/errorHandler');
const notFound = require('../middleware/notFound');

function buildApp() {
  const app = express();
  app.use(express.json({ limit: '100kb' }));

  app.get('/throw/app', (_req, _res, next) => next(new AppError(403, 'nope')));
  app.get('/throw/validation', (_req, _res, next) => {
    const err = new Error('bad name');
    err.name = 'ValidationError';
    next(err);
  });
  app.get('/throw/cast', (_req, _res, next) => {
    const err = new Error('bad id');
    err.name = 'CastError';
    err.path = 'userId';
    next(err);
  });
  app.get('/throw/jwt', (_req, _res, next) => {
    const err = new Error('jwt bad');
    err.name = 'JsonWebTokenError';
    next(err);
  });
  app.get('/throw/plain', (_req, _res, next) => next(new Error('boom')));

  app.post('/big', (_req, _res, _next) => _res.json({ ok: true }));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

const http = require('http');

function request(server, method, path, body) {
  return new Promise((resolve) => {
    const port = server.address().port;
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      { hostname: '127.0.0.1', port, path, method,
        headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {} },
      (res) => {
        let chunks = '';
        res.on('data', (c) => chunks += c);
        res.on('end', () => resolve({ status: res.statusCode, body: chunks ? JSON.parse(chunks) : {} }));
      }
    );
    if (data) req.write(data);
    req.end();
  });
}

function check(label, ok, detail) {
  if (ok) {
    console.log('  ✅ ' + label);
  } else {
    console.log('  ❌ ' + label + ' — ' + detail);
    process.exitCode = 1;
  }
}

(async () => {
  const app = buildApp();
  const server = app.listen(0);
  await new Promise((r) => server.on('listening', r));

  console.log('\n--- AppError 403 ---');
  let r = await request(server, 'GET', '/throw/app');
  check('status 403', r.status === 403, 'got ' + r.status);
  check('message', r.body.message === 'nope', JSON.stringify(r.body));
  check('no requestId on 4xx', !('requestId' in r.body), JSON.stringify(r.body));

  console.log('\n--- ValidationError ---');
  r = await request(server, 'GET', '/throw/validation');
  check('status 400', r.status === 400, 'got ' + r.status);
  check('message includes err.message', r.body.message === 'bad name', JSON.stringify(r.body));

  console.log('\n--- CastError ---');
  r = await request(server, 'GET', '/throw/cast');
  check('status 400', r.status === 400, 'got ' + r.status);
  check('message references path', r.body.message.includes('userId'), JSON.stringify(r.body));

  console.log('\n--- JWT error ---');
  r = await request(server, 'GET', '/throw/jwt');
  check('status 401', r.status === 401, 'got ' + r.status);
  check('message', r.body.message === 'Token is not valid', JSON.stringify(r.body));

  console.log('\n--- generic 500 ---');
  r = await request(server, 'GET', '/throw/plain');
  check('status 500', r.status === 500, 'got ' + r.status);
  check('message hides internals', r.body.message === 'Internal server error', JSON.stringify(r.body));
  check('requestId included on 5xx', typeof r.body.requestId === 'string' && r.body.requestId.length > 0, JSON.stringify(r.body));

  console.log('\n--- 404 ---');
  r = await request(server, 'GET', '/no-such-route');
  check('status 404', r.status === 404, 'got ' + r.status);
  check('message includes path', r.body.message.includes('/no-such-route'), JSON.stringify(r.body));

  console.log('\n--- body too large ---');
  const big = 'x'.repeat(150 * 1024);
  r = await request(server, 'POST', '/big', big);
  check('status 413', r.status === 413, 'got ' + r.status);
  check('message', r.body.message === 'Request body too large', JSON.stringify(r.body));

  console.log('\n--- duplicate key 11000 ---');
  // Use mongoose directly to synthesize a 11000 — simulated by AppError(409)
  // here, since we don't have a unique index wired up locally. The 11000
  // path in the handler is exercised by the Invoice email-uniqueness check
  // and other models; we trust it from inspection.
  const app2 = express();
  app2.use(express.json());
  app2.get('/throw/dup', (_req, _res, next) => {
    const err = new Error('dup');
    err.code = 11000;
    next(err);
  });
  app2.use(errorHandler);
  const s2 = app2.listen(0);
  await new Promise((r) => s2.on('listening', r));
  r = await request(s2, 'GET', '/throw/dup');
  check('dup status 409', r.status === 409, 'got ' + r.status);
  check('dup message', r.body.message === 'Resource already exists', JSON.stringify(r.body));
  s2.close();

  server.close();
  if (process.exitCode) console.log('\n❌ some checks failed');
  else console.log('\n✅ all error handler checks passed');
})();