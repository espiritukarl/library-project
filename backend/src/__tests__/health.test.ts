import request from 'supertest';

import { app } from '../app';

describe('healthcheck', () => {
  it('returns 200 OK', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

