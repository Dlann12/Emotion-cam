import test from 'node:test';
import assert from 'node:assert';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000/api';

test('Backend Health Check Endpoint returns ok', async () => {
  const res = await fetch(`${BASE_URL}/health`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.status, 'ok');
});

test('Auth Register rejects invalid email and weak password', async () => {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'invalid-email', password: '12', name: 'A' }),
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /Validasi gagal/);
});

test('Auth Register and Login Flow with valid credentials', async () => {
  const uniqueEmail = `test-${Date.now()}@example.com`;
  const password = 'StrongPassword123!';

  // 1. Register
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: uniqueEmail, password, name: 'Tester User' }),
  });
  assert.ok(regRes.status === 200 || regRes.status === 201, 'Registration status should be 200 or 201');
  const regData = await regRes.json();
  assert.strictEqual(regData.message, 'User created');

  // 2. Login
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: uniqueEmail, password }),
  });
  assert.strictEqual(loginRes.status, 200);
  const loginData = await loginRes.json();
  assert.ok(loginData.token, 'Token should be returned on login');

  // 3. Authenticated /auth/me
  const meRes = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${loginData.token}` },
  });
  assert.strictEqual(meRes.status, 200);
  const meData = await meRes.json();
  assert.strictEqual(meData.email, uniqueEmail);
});
