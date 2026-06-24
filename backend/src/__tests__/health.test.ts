jest.setTimeout(30000);

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let app: any;
let mongo: MongoMemoryServer | null = null;

const seedEnv = () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh';
  process.env.JWT_ACCESS_TTL = '15m';
  process.env.JWT_REFRESH_TTL = '7d';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.CORS_ORIGIN = '*';
  process.env.CLOUDINARY_CLOUD_NAME = 'demo';
  process.env.CLOUDINARY_API_KEY = 'test';
  process.env.CLOUDINARY_API_SECRET = 'test-secret';
  process.env.CLOUDINARY_UPLOAD_FOLDER = 'tasktracer-test';
  process.env.SQUARE_ENV = 'sandbox';
  process.env.SQUARE_ACCESS_TOKEN = 'test';
  process.env.SQUARE_LOCATION_ID = 'test';
  process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = 'test';
  process.env.SQUARE_WEBHOOK_URL = 'http://localhost:4000/api/billing/webhook';
  process.env.BASE_URL = 'http://localhost:4000';
};

beforeAll(async () => {
  seedEnv();
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();

  const mod = await import('../app');
  app = mod.createApp();

  await mongoose.connect(process.env.MONGODB_URI);
});

afterAll(async () => {
  if (mongoose.connection.db) {
    await mongoose.connection.dropDatabase();
  }

  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }

  if (mongo) {
    await mongo.stop();
  }
});

afterEach(async () => {
  if (mongoose.connection.db) {
    await mongoose.connection.db.dropDatabase();
  }
});

describe('API smoke', () => {
  test('health endpoint returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('task completion enforces photo and QR requirements', async () => {
    const tenantId = 'hospitalA';
    const admin = { name: 'Admin', email: 'admin@example.com', password: 'Password123!', role: 'admin' };
    const associate = { name: 'Associate', email: 'associate@example.com', password: 'Password123!', role: 'associate' };

    await request(app).post('/api/auth/register').send({ tenantId, ...admin });
    await request(app).post('/api/auth/register').send({ tenantId, ...associate });

    const adminLogin = await request(app).post('/api/auth/login').send({
      tenantId,
      email: admin.email,
      password: admin.password,
    });
    const adminToken = adminLogin.body.accessToken;

    const associateLogin = await request(app).post('/api/auth/login').send({
      tenantId,
      email: associate.email,
      password: associate.password,
    });
    const associateToken = associateLogin.body.accessToken;
    const associateId = associateLogin.body.user.id;

    const locationRes = await request(app)
      .post('/api/admin/locations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'ER', qrCode: 'ER-01' });
    const locationId = locationRes.body.location._id;

    const dutyRes = await request(app)
      .post('/api/admin/duties')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Clean ER',
        locationId,
        requiresPhoto: true,
        requiresQr: true,
      });
    const dutyId = dutyRes.body.duty._id;

    const scheduleRes = await request(app)
      .post('/api/admin/schedule')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        dutyId,
        associateId,
        startsAt: new Date().toISOString(),
        endsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });
    const taskId = scheduleRes.body.task._id;

    const missingProof = await request(app)
      .post('/api/tasks/complete')
      .set('Authorization', `Bearer ${associateToken}`)
      .send({ taskId });
    expect(missingProof.status).toBe(400);

    const completed = await request(app)
      .post('/api/tasks/complete')
      .set('Authorization', `Bearer ${associateToken}`)
      .send({
        taskId,
        proofPhoto: 'https://example.com/proof.jpg',
        qrCode: 'ER-01',
      });

    expect(completed.status).toBe(200);
    expect(completed.body.task.status).toBe('completed');
  });

  test('upload-proof returns Cloudinary signed upload params', async () => {
    const tenantId = 'hospitalB';
    const admin = { name: 'Admin', email: 'admin2@example.com', password: 'Password123!', role: 'admin' };
    const associate = { name: 'Associate', email: 'associate2@example.com', password: 'Password123!', role: 'associate' };

    await request(app).post('/api/auth/register').send({ tenantId, ...admin });
    await request(app).post('/api/auth/register').send({ tenantId, ...associate });

    const adminLogin = await request(app).post('/api/auth/login').send({
      tenantId,
      email: admin.email,
      password: admin.password,
    });
    const adminToken = adminLogin.body.accessToken;

    const associateLogin = await request(app).post('/api/auth/login').send({
      tenantId,
      email: associate.email,
      password: associate.password,
    });
    const associateToken = associateLogin.body.accessToken;
    const associateId = associateLogin.body.user.id;

    const locationRes = await request(app)
      .post('/api/admin/locations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'ICU', qrCode: 'ICU-01' });
    const locationId = locationRes.body.location._id;

    const dutyRes = await request(app)
      .post('/api/admin/duties')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Clean ICU',
        locationId,
        requiresPhoto: true,
      });
    const dutyId = dutyRes.body.duty._id;

    const scheduleRes = await request(app)
      .post('/api/admin/schedule')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        dutyId,
        associateId,
        startsAt: new Date().toISOString(),
        endsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });
    const taskId = scheduleRes.body.task._id;

    const uploadRes = await request(app)
      .post('/api/tasks/upload-proof')
      .set('Authorization', `Bearer ${associateToken}`)
      .send({
        taskId,
        fileName: 'proof photo.jpg',
        contentType: 'image/jpeg',
      });

    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body.uploadUrl).toBe('https://api.cloudinary.com/v1_1/demo/image/upload');
    expect(uploadRes.body.apiKey).toBe('test');
    expect(uploadRes.body.publicId).toMatch(new RegExp(`^tasktracer-test/${tenantId}/tasks/${taskId}/`));
    expect(uploadRes.body.signature).toBeTruthy();
    expect(uploadRes.body.timestamp).toEqual(expect.any(Number));
  });
});

