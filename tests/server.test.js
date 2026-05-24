import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import createServer from '../server/server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testDbPath = path.join(__dirname, '..', 'server', 'database.test.sqlite');

let server;
let agent;

beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.DB_PATH = testDbPath;
    if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
    }
});

beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
    }

    const app = createServer();
    server = app.listen(0);

    agent = request.agent(server);
});

afterEach((done) => {
    server.close(() => {
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
        done();
    });
});

afterAll(() => {
    if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
    }
});

describe('API server', () => {
    test('should return movies list', async () => {
        const res = await agent.get('/api/movies');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThanOrEqual(5);
        expect(res.body[0]).toHaveProperty('title');
    });

    test('should register and login a user', async () => {
        const registerRes = await agent.post('/api/register')
            .send({ username: 'testuser', email: 'test@example.com', password: 'password123' });

        expect(registerRes.status).toBe(201);
        expect(registerRes.body).toHaveProperty('message', 'Registrace úspěšná');
        expect(registerRes.body.user).toHaveProperty('username', 'testuser');
        expect(registerRes.headers['set-cookie']).toBeDefined();

        const meRes = await agent.get('/api/me');

        expect(meRes.status).toBe(200);
        expect(meRes.body).toEqual(expect.objectContaining({ loggedIn: true }));
        expect(meRes.body.user).toHaveProperty('username', 'testuser');
    });

    test('should require authentication for creating review', async () => {
        const reviewRes = await agent.post('/api/reviews')
            .send({ movieId: 1, rating: 8, comment: 'Test review comment' });

        expect(reviewRes.status).toBe(401);
        expect(reviewRes.body).toHaveProperty('error', 'Musíte být přihlášeni');
    });

    test('should serve profile page HTML', async () => {
        const res = await agent.get('/profile.html');
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain('text/html');
        expect(res.text).toContain('Profil uživatele');
    });

    test('should redirect /profile to /profile.html', async () => {
        const res = await agent.get('/profile');
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/profile.html');
    });

    test('should return a user profile after registration', async () => {
        const registerRes = await agent.post('/api/register')
            .send({ username: 'profileuser', email: 'profile@example.com', password: 'password123' });

        expect(registerRes.status).toBe(201);

        const profileRes = await agent.get('/api/users/profileuser');
        expect(profileRes.status).toBe(200);
        expect(profileRes.body).toEqual(expect.objectContaining({
            username: 'profileuser',
            reviews: expect.any(Array),
            watchlist: expect.any(Array),
        }));
    });

    test('should return 404 for unknown user profile', async () => {
        const res = await agent.get('/api/users/doesnotexist');
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error', 'Uživatel nenalezen');
    });

    test('should return trending movies', async () => {
        const res = await agent.get('/api/movies/trending');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body[0]).toHaveProperty('averageRating');
    });

    test('should require login for recommendations and then return recommendations', async () => {
        const anonRes = await agent.get('/api/recommendations');
        expect(anonRes.status).toBe(401);

        const registerRes = await agent.post('/api/register')
            .send({ username: 'recoUser', email: 'reco@example.com', password: 'password123' });
        expect(registerRes.status).toBe(201);

        const recRes = await agent.get('/api/recommendations');
        expect(recRes.status).toBe(200);
        expect(Array.isArray(recRes.body)).toBe(true);
        expect(recRes.body.length).toBeGreaterThan(0);
    });

    test('should manage watchlist lifecycle', async () => {
        await agent.post('/api/register').send({ username: 'watcher', email: 'watcher@example.com', password: 'password123' });

        const addRes = await agent.post('/api/watchlist')
            .send({ movieId: 1, status: 'Watching', watchedAt: '2026-05-23', notes: 'Need to watch' });
        expect(addRes.status).toBe(200);

        const listRes = await agent.get('/api/watchlist');
        expect(listRes.status).toBe(200);
        expect(Array.isArray(listRes.body)).toBe(true);
        expect(listRes.body.length).toBe(1);
        expect(listRes.body[0]).toMatchObject({ id: 1, status: 'Watching', notes: 'Need to watch' });

        const updateRes = await agent.patch('/api/watchlist/1')
            .send({ status: 'Watched', watchedAt: '2026-05-24', notes: 'Great film' });
        expect(updateRes.status).toBe(200);
        expect(updateRes.body.status).toBe('Watched');

        const deleteRes = await agent.delete('/api/watchlist/1');
        expect(deleteRes.status).toBe(200);

        const emptyRes = await agent.get('/api/watchlist');
        expect(emptyRes.status).toBe(200);
        expect(emptyRes.body).toEqual([]);
    });

    test('should return movie detail with similar movies', async () => {
        const res = await agent.get('/api/movies/1');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('title');
        expect(res.body).toHaveProperty('similar');
        expect(Array.isArray(res.body.similar)).toBe(true);
    });

    test('should allow adding comments to a review', async () => {
        await agent.post('/api/register').send({ username: 'commenter', email: 'commenter@example.com', password: 'password123' });
        await agent.post('/api/reviews').send({ movieId: 1, rating: 9, comment: 'This is a great film to watch.' });

        const movieRes = await agent.get('/api/movies/1');
        const reviewId = movieRes.body.reviews[0]?.id;
        expect(reviewId).toBeDefined();

        const commentRes = await agent.post(`/api/reviews/${reviewId}/comments`).send({ comment: 'Nice commentary' });
        expect(commentRes.status).toBe(201);
        expect(commentRes.body).toHaveProperty('comment', 'Nice commentary');
    });

    test('should return stats with counts', async () => {
        const res = await agent.get('/api/stats');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('users');
        expect(res.body).toHaveProperty('movies');
        expect(res.body).toHaveProperty('reviews');
        expect(res.body.movies).toBeGreaterThanOrEqual(5);
    });
});
