import Database from '../server/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Polyfill for process.cwd() in testing
global.process.cwd = () => path.join(__dirname, '..');

let db;
let testDbPath;

describe('Database', () => {
    beforeEach(() => {
        testDbPath = path.join(__dirname, '..', 'server', `database.test.${Date.now()}.sqlite`);
        db = new Database(testDbPath);
    });

    afterEach(() => {
        if (db) {
            db.close();
        }

        if (testDbPath && fs.existsSync(testDbPath)) {
            try {
                fs.unlinkSync(testDbPath);
            } catch (error) {
                if (error.code !== 'EBUSY' && error.code !== 'EPERM') {
                    throw error;
                }
            }
        }
    });

    test('should initialize with empty data', () => {
        expect(db.data.users).toBeDefined();
        expect(db.data.movies).toBeDefined();
        expect(db.data.reviews).toBeDefined();
        expect(db.data.votes).toBeDefined();
    });

    test('should create a new user', () => {
        const user = db.createUser('testuser', 'test@example.com', 'hashedpassword');
        expect(user).toBeDefined();
        expect(user.username).toBe('testuser');
        expect(user.email).toBe('test@example.com');
    });

    test('should prevent duplicate usernames', () => {
        db.createUser('testuser', 'test@example.com', 'hashedpassword');
        expect(() => {
            db.createUser('testuser', 'other@example.com', 'otherpassword');
        }).toThrow('Uživatel s tímto jménem nebo emailem již existuje');
    });

    test('should get user by username', () => {
        const createdUser = db.createUser('testuser', 'test@example.com', 'hashedpassword');
        const foundUser = db.getUserByUsername('testuser');
        expect(foundUser).toBeDefined();
        expect(foundUser.id).toBe(createdUser.id);
    });

    test('should get all movies', () => {
        const movies = db.getAllMovies();
        expect(Array.isArray(movies)).toBe(true);
        expect(movies.length).toBeGreaterThan(0);
    });

    test('should search movies by title', () => {
        const movies = db.searchMovies('Shawshank');
        expect(movies.length).toBeGreaterThan(0);
        expect(movies[0].title).toContain('Shawshank');
    });

    test('should create a review', () => {
        const user = db.createUser('reviewer', 'reviewer@example.com', 'hashedpassword');
        const movie = db.getMovieById(1);
        
        const review = db.createReview(movie.id, user.id, 8, 'Great movie with amazing plot');
        expect(review).toBeDefined();
        expect(review.rating).toBe(8);
        expect(review.userId).toBe(user.id);
    });

    test('should prevent duplicate reviews from same user', () => {
        const user = db.createUser('reviewer', 'reviewer@example.com', 'hashedpassword');
        const movie = db.getMovieById(1);
        
        db.createReview(movie.id, user.id, 8, 'Great movie with amazing plot');
        expect(() => {
            db.createReview(movie.id, user.id, 9, 'Even better on second thought');
        }).toThrow('Pro tento film již máte recenzi');
    });

    test('should calculate average rating for movie', () => {
        const user1 = db.createUser('reviewer1', 'reviewer1@example.com', 'pass');
        const user2 = db.createUser('reviewer2', 'reviewer2@example.com', 'pass');
        const movie = db.getMovieById(1);
        
        db.createReview(movie.id, user1.id, 8, 'Good');
        db.createReview(movie.id, user2.id, 6, 'Okay');
        
        const rating = db.getAverageRating(movie.id);
        expect(rating.average).toBe('7.0');
        expect(rating.count).toBe(2);
    });

    test('should vote on a review', () => {
        const user1 = db.createUser('reviewer', 'reviewer@example.com', 'pass');
        const user2 = db.createUser('voter', 'voter@example.com', 'pass');
        const movie = db.getMovieById(1);
        
        const review = db.createReview(movie.id, user1.id, 8, 'Good');
        db.voteReview(review.id, user2.id, 1);
        
        const userVote = db.getUserVote(review.id, user2.id);
        expect(userVote).toBe(1);
    });

    test('should update existing vote', () => {
        const user1 = db.createUser('reviewer', 'reviewer@example.com', 'pass');
        const user2 = db.createUser('voter', 'voter@example.com', 'pass');
        const movie = db.getMovieById(1);
        
        const review = db.createReview(movie.id, user1.id, 8, 'Good');
        db.voteReview(review.id, user2.id, 1);
        db.voteReview(review.id, user2.id, -1);
        
        const userVote = db.getUserVote(review.id, user2.id);
        expect(userVote).toBe(-1);
    });

    test('should add, update and remove watchlist entries', () => {
        const user = db.createUser('watcher', 'watcher@example.com', 'pass');
        const movie = db.getMovieById(1);

        const added = db.addToWatchlist(user.id, movie.id, { status: 'Watching', watchedAt: '2026-05-23', notes: 'Review later' });
        expect(added).toBe(true);

        const entry = db.getWatchlistEntry(user.id, movie.id);
        expect(entry).toBeDefined();
        expect(entry.status).toBe('Watching');
        expect(entry.notes).toBe('Review later');

        const updated = db.updateWatchlistEntry(user.id, movie.id, { status: 'Watched', notes: 'Loved it' });
        expect(updated.status).toBe('Watched');

        expect(db.removeFromWatchlist(user.id, movie.id)).toBe(true);
        expect(db.getWatchlist(user.id)).toEqual([]);
    });

    test('should create review comments and retrieve them', () => {
        const user = db.createUser('reviewer', 'reviewer@example.com', 'pass');
        const movie = db.getMovieById(1);
        const review = db.createReview(movie.id, user.id, 8, 'Loved it, highly recommend.');

        const comment = db.createReviewComment(review.id, user.id, 'Great insight');
        expect(comment).toBeDefined();
        expect(comment.comment).toBe('Great insight');

        const comments = db.getReviewComments(review.id);
        expect(Array.isArray(comments)).toBe(true);
        expect(comments[0].comment).toBe('Great insight');
    });

    test('should get reviews for a movie', () => {
        const user = db.createUser('reviewer', 'reviewer@example.com', 'pass');
        const movie = db.getMovieById(1);
        
        db.createReview(movie.id, user.id, 8, 'Excellent!');
        
        const reviews = db.getReviewsByMovieId(movie.id);
        expect(Array.isArray(reviews)).toBe(true);
        expect(reviews.length).toBeGreaterThan(0);
        expect(reviews[0].username).toBe('reviewer');
    });
});
