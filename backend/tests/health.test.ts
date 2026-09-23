import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

describe('SriPon API smoke tests', () => {
  const app = createApp();

  it('GET /health returns ok with service info', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.app).toBe('SriPon');
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.services).toBeDefined();
  });

  it('GET /api exposes docs links without secrets', async () => {
    const res = await request(app).get('/api');

    expect(res.status).toBe(200);
    expect(res.body.data.docs).toBe('/api/docs');
    expect(JSON.stringify(res.body)).not.toMatch(/secret|password|token/i);
  });

  it('GET /api/openapi.json is valid OpenAPI', async () => {
    const res = await request(app).get('/api/openapi.json');

    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.info.title).toBe('SriPon API');
  });

  it('unknown routes return the SriPon error envelope', async () => {
    const res = await request(app).get('/api/v1/nope');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(typeof res.body.message).toBe('string');
  });

  it('unimplemented admin endpoints remain auth-guarded (never accidentally live)', async () => {
    const res = await request(app).get('/api/v1/admin/customers');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});