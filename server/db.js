import fs from 'fs';
import path from 'path';
import betterSqlite3 from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { and, desc, eq, or } from 'drizzle-orm';
import { movies, reviews, users, votes } from './schema.js';

const DEFAULT_DB_FILE = path.join(process.cwd(), 'server', 'database.sqlite');

const DIRECTOR_INFO = {
  'Frank Darabont': {
    bio: 'Frank Darabont is an American film and television director, producer, and screenwriter. He is best known for directing The Shawshank Redemption and The Green Mile. His work is characterized by powerful storytelling and deep character development.',
    birthYear: 1959,
    nationality: 'American'
  },
  'Francis Ford Coppola': {
    bio: 'Francis Ford Coppola is an American film and television producer and screenwriter. He is considered one of the greatest filmmakers of all time, known for the iconic The Godfather trilogy. His innovative directorial style influenced generations of filmmakers.',
    birthYear: 1939,
    nationality: 'American'
  },
  'Christopher Nolan': {
    bio: 'Christopher Nolan is a British-American film and television producer and screenwriter. Renowned for his complex storytelling and innovative cinematography, he has directed acclaimed films including The Dark Knight trilogy, Inception, and Interstellar.',
    birthYear: 1970,
    nationality: 'British-American'
  },
  'Quentin Tarantino': {
    bio: 'Quentin Tarantino is an American film director and screenwriter. Known for his distinctive directorial style featuring graphic violence, lengthy dialogues, and unconventional narratives, he has created iconic films like Pulp Fiction, Kill Bill, and Inglorious Basterds.',
    birthYear: 1963,
    nationality: 'American'
  }
};

const ACTOR_INFO = {
  'Tim Robbins': { bio: 'American actor and director, known for his role in The Shawshank Redemption.', birthYear: 1958, nationality: 'American' },
  'Morgan Freeman': { bio: 'American actor and narrator, awarded for many roles including in The Shawshank Redemption.', birthYear: 1937, nationality: 'American' },
  'Marlon Brando': { bio: 'Influential American actor known for The Godfather and On the Waterfront.', birthYear: 1924, nationality: 'American' },
  'Al Pacino': { bio: 'American actor and filmmaker, noted for powerful performances in The Godfather series.', birthYear: 1940, nationality: 'American' },
  'Christian Bale': { bio: 'British actor known for intense method acting and roles including Batman in The Dark Knight.', birthYear: 1974, nationality: 'British' },
  'Heath Ledger': { bio: 'Australian actor celebrated for his performance as the Joker in The Dark Knight.', birthYear: 1979, nationality: 'Australian' },
  'John Travolta': { bio: 'American actor and singer, breakout roles in Saturday Night Fever and Pulp Fiction.', birthYear: 1954, nationality: 'American' },
  'Samuel L. Jackson': { bio: 'American actor and producer with a prolific career across many genre-defining films.', birthYear: 1948, nationality: 'American' },
  'Leonardo DiCaprio': { bio: 'American actor and producer, known for a wide range of roles including Inception.', birthYear: 1974, nationality: 'American' }
};

const INITIAL_MOVIES = [
  {
    title: 'The Shawshank Redemption',
    year: 1994,
    director: 'Frank Darabont',
    actors: JSON.stringify(['Tim Robbins','Morgan Freeman']),
    genre: 'Drama',
    description: 'The story of two prisoners who form a bond and find redemption through acts of common decency.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMDAyY2FhYjctNDc5OS00MDNlLThiMGUtY2UxYWVkNGY2ZjljXkEyXkFqcGc@._V1_SX300.jpg',
    createdAt: new Date().toISOString()
  },
  {
    title: 'The Godfather',
    year: 1972,
    director: 'Francis Ford Coppola',
    actors: JSON.stringify(['Marlon Brando','Al Pacino','James Caan']),
    genre: 'Crime',
    description: 'An aging patriarch transfers control of his clandestine empire to his reluctant son.',
    poster: 'https://m.media-amazon.com/images/M/MV5BYTJkNGQyZDgtZDQ0NC00MDM0LWEzZWQtZDUzZDEwMDljZWNjXkEyXkFqcGc@._V1_SX300.jpg',
    createdAt: new Date().toISOString()
  },
  {
    title: 'The Dark Knight',
    year: 2008,
    director: 'Christopher Nolan',
    actors: JSON.stringify(['Christian Bale','Heath Ledger','Aaron Eckhart']),
    genre: 'Action',
    description: 'Batman faces one of the greatest psychological and physical tests when the Joker wreaks havoc on Gotham.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_SX300.jpg',
    createdAt: new Date().toISOString()
  },
  {
    title: 'Pulp Fiction',
    year: 1994,
    director: 'Quentin Tarantino',
    actors: JSON.stringify(['John Travolta','Samuel L. Jackson','Uma Thurman']),
    genre: 'Crime',
    description: 'The lives of two hitmen, a boxer, a gangster, and his wife intertwine in four tales of violence and redemption.',
    poster: 'https://m.media-amazon.com/images/M/MV5BYTViYTE3ZGQtNDBlMC00ZTAyLTkyODMtZGRiZDg0MjA2YThkXkEyXkFqcGc@._V1_SX300.jpg',
    createdAt: new Date().toISOString()
  },
  {
    title: 'Inception',
    year: 2010,
    director: 'Christopher Nolan',
    actors: JSON.stringify(['Leonardo DiCaprio','Joseph Gordon-Levitt','Ellen Page']),
    genre: 'Sci-Fi',
    description: 'A thief enters people’s dreams to steal secrets, then must perform inception on a target mind.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_SX300.jpg',
    createdAt: new Date().toISOString()
  },
  {
    title: 'Fight Club',
    year: 1999,
    director: 'David Fincher',
    actors: JSON.stringify(['Brad Pitt','Edward Norton','Helena Bonham Carter']),
    genre: 'Drama',
    description: 'An insomniac office worker and a soapmaker form an underground fight club that evolves into something much more.',
    poster: 'https://m.media-amazon.com/images/M/MV5BN2EyZjM3NzctYzQwZS00N2QxLWI2NzctODJhMzlhMWY3YmEwXkEyXkFqcGdeQXVyMDI5MDg0Ng@@._V1_SX300.jpg',
    createdAt: new Date().toISOString()
  },
  {
    title: 'The Matrix',
    year: 1999,
    director: 'The Wachowskis',
    actors: JSON.stringify(['Keanu Reeves','Laurence Fishburne','Carrie-Anne Moss']),
    genre: 'Sci-Fi',
    description: 'A hacker discovers the nature of reality and joins a rebellion against the machines that control humanity.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNzQzOTk3NjAtNDdiNi00ZWRjLTgwMmEtM2FkZjFkOTczOTQzXkEyXkFqcGdeQXVyNjU0OTQ0OTY@._V1_SX300.jpg',
    createdAt: new Date().toISOString()
  },
  {
    title: 'Forrest Gump',
    year: 1994,
    director: 'Robert Zemeckis',
    actors: JSON.stringify(['Tom Hanks','Robin Wright','Gary Sinise']),
    genre: 'Drama',
    description: 'Forrest Gump recounts the stories of his extraordinary life during key moments in American history.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNWIwODc2YzktNjg2Yy00ZjBlLTg2YWEtNDYxYzZlOTRmZjY3XkEyXkFqcGdeQXVyNDY2MTk1ODE@._V1_SX300.jpg',
    createdAt: new Date().toISOString()
  },
  {
    title: 'The Lord of the Rings: The Fellowship of the Ring',
    year: 2001,
    director: 'Peter Jackson',
    actors: JSON.stringify(['Elijah Wood','Ian McKellen','Viggo Mortensen']),
    genre: 'Adventure',
    description: 'A meek hobbit and eight companions set out on a journey to destroy the One Ring and save Middle-earth.',
    poster: 'https://m.media-amazon.com/images/M/MV5BN2EyZjM3NzctYzQwZS00N2QxLWI2NzctODJhMzlhMWY3YmEwXkEyXkFqcGdeQXVyMDI5MDg0Ng@@._V1_SX300.jpg',
    createdAt: new Date().toISOString()
  },
  {
    title: 'The Social Network',
    year: 2010,
    director: 'David Fincher',
    actors: JSON.stringify(['Jesse Eisenberg','Andrew Garfield','Justin Timberlake']),
    genre: 'Drama',
    description: 'The story of how Mark Zuckerberg created Facebook and the lawsuits that followed.',
    poster: 'https://m.media-amazon.com/images/M/MV5BZjYxNjVhMjUtNzA0OS00ZThhLTlkMTAtYmMwNTNhN2QxNGE2XkEyXkFqcGdeQXVyNDIzMzcwNjc@._V1_SX300.jpg',
    createdAt: new Date().toISOString()
  }
];

export default class Database {
  constructor(dbPath) {
    this.file = dbPath || process.env.DB_PATH || DEFAULT_DB_FILE;
    const fileExists = fs.existsSync(this.file);
    this.sqlite = betterSqlite3(this.file);
    this.db = drizzle(this.sqlite);
    this.createTables();
    this.ensureActorsColumn();
    this.ensureWatchlistColumns();

    if (!fileExists) {
      this.seedData();
    }
  }

  createTables() {
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        email TEXT NOT NULL,
        password TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS movies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        year INTEGER NOT NULL,
        director TEXT NOT NULL,
        actors TEXT NOT NULL,
        genre TEXT NOT NULL,
        description TEXT NOT NULL,
        poster TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        movieId INTEGER NOT NULL,
        userId INTEGER NOT NULL,
        rating INTEGER NOT NULL,
        comment TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        UNIQUE(movieId, userId)
      );

      CREATE TABLE IF NOT EXISTS review_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reviewId INTEGER NOT NULL,
        userId INTEGER NOT NULL,
        comment TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reviewId INTEGER NOT NULL,
        reporterId INTEGER NOT NULL,
        reason TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS watchlists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        movieId INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'to watch',
        watchedAt TEXT,
        notes TEXT,
        createdAt TEXT NOT NULL,
        UNIQUE(userId, movieId)
      );

      CREATE TABLE IF NOT EXISTS votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reviewId INTEGER NOT NULL,
        userId INTEGER NOT NULL,
        vote INTEGER NOT NULL,
        createdAt TEXT NOT NULL,
        UNIQUE(reviewId, userId)
      );
    `);
  }

  seedData() {
    this.db.insert(movies).values(INITIAL_MOVIES).run();
  }

  ensureActorsColumn() {
    const row = this.sqlite.prepare("PRAGMA table_info('movies')").all();
    const hasActors = row.some((col) => col.name === 'actors');
    if (!hasActors) {
      this.sqlite.exec('ALTER TABLE movies ADD COLUMN actors TEXT NOT NULL DEFAULT "[]"');
    }
  }

  ensureWatchlistColumns() {
    const row = this.sqlite.prepare("PRAGMA table_info('watchlists')").all();
    const columnNames = row.map((col) => col.name);
    if (!columnNames.includes('status')) {
      this.sqlite.exec("ALTER TABLE watchlists ADD COLUMN status TEXT NOT NULL DEFAULT 'to watch'");
    }
    if (!columnNames.includes('watchedAt')) {
      this.sqlite.exec('ALTER TABLE watchlists ADD COLUMN watchedAt TEXT');
    }
    if (!columnNames.includes('notes')) {
      this.sqlite.exec('ALTER TABLE watchlists ADD COLUMN notes TEXT');
    }
  }

  parseMovie(movie) {
    if (!movie) return movie;
    return {
      ...movie,
      actors: movie.actors ? JSON.parse(movie.actors) : [],
    };
  }

  get data() {
    return {
      users: this.sqlite.prepare('SELECT * FROM users').all(),
      movies: this.sqlite.prepare('SELECT * FROM movies').all().map((m) => this.parseMovie(m)),
      reviews: this.sqlite.prepare('SELECT * FROM reviews').all(),
      votes: this.sqlite.prepare('SELECT * FROM votes').all(),
    };
  }

  getUserByUsername(username) {
    return this.sqlite.prepare('SELECT * FROM users WHERE username = ?').get(username);
  }

  getUserByEmail(email) {
    return this.sqlite.prepare('SELECT * FROM users WHERE email = ?').get(email);
  }

  createUser(username, email, hashedPassword) {
    const existingUser = this.sqlite.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, email);

    if (existingUser) {
      throw new Error('Uživatel s tímto jménem nebo emailem již existuje');
    }

    const result = this.db.insert(users).values({
      username,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    }).run();

    return {
      id: Number(result.lastInsertRowid),
      username,
      email
    };
  }

  getAllMovies() {
    return this.db.select().from(movies).orderBy(desc(movies.year)).all().map((m) => this.parseMovie(m));
  }

  getMovieById(id) {
    return this.parseMovie(this.db.select().from(movies).where(eq(movies.id, Number(id))).get());
  }

  searchMovies(query) {
    const sanitized = `%${query.toLowerCase()}%`;
    return this.sqlite
      .prepare(
        `SELECT * FROM movies WHERE LOWER(title) LIKE ? OR LOWER(director) LIKE ? OR LOWER(genre) LIKE ? ORDER BY year DESC`
      )
      .all(sanitized, sanitized, sanitized)
      .map((m) => this.parseMovie(m));
  }

  createReview(movieId, userId, rating, comment) {
    const existingReview = this.db.select().from(reviews).where(and(eq(reviews.movieId, Number(movieId)), eq(reviews.userId, Number(userId)))).get();

    if (existingReview) {
      throw new Error('Pro tento film již máte recenzi');
    }

    const result = this.db.insert(reviews).values({
      movieId: Number(movieId),
      userId: Number(userId),
      rating: Number(rating),
      comment,
      createdAt: new Date().toISOString()
    }).run();

    return {
      id: Number(result.lastInsertRowid),
      movieId: Number(movieId),
      userId: Number(userId),
      rating: Number(rating),
      comment
    };
  }

  getReviewsByMovieId(movieId) {
    return this.sqlite
      .prepare(
        `SELECT r.*, u.username AS username, IFNULL(SUM(v.vote), 0) AS score,
                IFNULL(c.commentCount, 0) AS commentCount
         FROM reviews r
         LEFT JOIN users u ON u.id = r.userId
         LEFT JOIN votes v ON v.reviewId = r.id
         LEFT JOIN (
           SELECT reviewId, COUNT(*) AS commentCount
           FROM review_comments
           GROUP BY reviewId
         ) c ON c.reviewId = r.id
         WHERE r.movieId = ?
         GROUP BY r.id
         ORDER BY r.createdAt DESC`
      )
      .all(Number(movieId));
  }

  voteReview(reviewId, userId, vote) {
    const existing = this.db.select().from(votes).where(and(eq(votes.reviewId, Number(reviewId)), eq(votes.userId, Number(userId)))).get();

    if (existing) {
      this.db.update(votes).set({ vote: Number(vote), createdAt: new Date().toISOString() }).where(eq(votes.id, Number(existing.id))).run();
    } else {
      this.db.insert(votes).values({
        reviewId: Number(reviewId),
        userId: Number(userId),
        vote: Number(vote),
        createdAt: new Date().toISOString()
      }).run();
    }

    return true;
  }

  getUserVote(reviewId, userId) {
    const row = this.db.select().from(votes).where(and(eq(votes.reviewId, Number(reviewId)), eq(votes.userId, Number(userId)))).get();
    return row ? Number(row.vote) : 0;
  }

  getAverageRating(movieId) {
    const row = this.sqlite.prepare('SELECT COUNT(*) AS count, AVG(rating) AS average FROM reviews WHERE movieId = ?').get(Number(movieId));
    const count = Number(row.count || 0);
    const average = count === 0 ? '0.0' : Number(row.average).toFixed(1);
    return { average, count };
  }

  getTrendingMovies(limit = 5) {
    return this.sqlite
      .prepare(
        `SELECT m.*, IFNULL(r.reviewCount, 0) AS reviewCount, IFNULL(r.average, 0) AS averageRating
         FROM movies m
         LEFT JOIN (
           SELECT movieId, COUNT(*) AS reviewCount, AVG(rating) AS average
           FROM reviews
           GROUP BY movieId
         ) r ON r.movieId = m.id
         ORDER BY reviewCount DESC, averageRating DESC, m.year DESC
         LIMIT ?`
      )
      .all(Number(limit))
      .map((m) => this.parseMovie(m));
  }

  getSimilarMovies(movieId) {
    const movie = this.getMovieById(movieId);
    if (!movie) return [];

    return this.getAllMovies()
      .filter((candidate) => candidate.id !== Number(movieId))
      .map((candidate) => {
        let score = 0;
        if (candidate.genre === movie.genre) score += 3;
        if (candidate.director === movie.director) score += 4;
        if (candidate.actors.some((actor) => movie.actors.includes(actor))) score += 2;
        return { candidate, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((item) => item.candidate);
  }

  getRecommendations(userId, limit = 5) {
    const watchlist = this.getWatchlist(Number(userId));
    const reviews = this.sqlite
      .prepare(
        `SELECT r.movieId, m.genre, m.director
         FROM reviews r
         JOIN movies m ON m.id = r.movieId
         WHERE r.userId = ?`
      )
      .all(Number(userId));

    const preferredGenres = {};
    const preferredDirectors = {};
    const excludedMovieIds = new Set();

    watchlist.forEach((movie) => {
      preferredGenres[movie.genre] = (preferredGenres[movie.genre] || 0) + 1;
      preferredDirectors[movie.director] = (preferredDirectors[movie.director] || 0) + 1;
      excludedMovieIds.add(Number(movie.id));
    });

    reviews.forEach((row) => {
      preferredGenres[row.genre] = (preferredGenres[row.genre] || 0) + 2;
      preferredDirectors[row.director] = (preferredDirectors[row.director] || 0) + 2;
      excludedMovieIds.add(Number(row.movieId));
    });

    return this.getAllMovies()
      .filter((movie) => !excludedMovieIds.has(Number(movie.id)))
      .map((movie) => {
        const rating = this.getAverageRating(movie.id);
        const genreScore = preferredGenres[movie.genre] || 0;
        const directorScore = preferredDirectors[movie.director] || 0;
        const overallScore = genreScore * 3 + directorScore * 4 + Number(rating.average);
        return { movie, score: overallScore, reviewCount: rating.count };
      })
      .sort((a, b) => b.score - a.score || b.reviewCount - a.reviewCount)
      .slice(0, limit)
      .map((entry) => entry.movie);
  }

  getStats() {
    const usersCount = this.sqlite.prepare('SELECT COUNT(*) AS count FROM users').get().count;
    const moviesCount = this.sqlite.prepare('SELECT COUNT(*) AS count FROM movies').get().count;
    const reviewsCount = this.sqlite.prepare('SELECT COUNT(*) AS count FROM reviews').get().count;
    return {
      users: Number(usersCount),
      movies: Number(moviesCount),
      reviews: Number(reviewsCount)
    };
  }

  getWatchlist(userId) {
    return this.sqlite
      .prepare(
        `SELECT m.*, w.status, w.watchedAt, w.notes
         FROM watchlists w
         JOIN movies m ON m.id = w.movieId
         WHERE w.userId = ?
         ORDER BY w.createdAt DESC`
      )
      .all(Number(userId))
      .map((m) => this.parseMovie(m));
  }

  getWatchlistEntry(userId, movieId) {
    const row = this.sqlite
      .prepare(
        `SELECT m.*, w.status, w.watchedAt, w.notes
         FROM watchlists w
         JOIN movies m ON m.id = w.movieId
         WHERE w.userId = ? AND w.movieId = ?`
      )
      .get(Number(userId), Number(movieId));
    return row ? this.parseMovie(row) : null;
  }

  addToWatchlist(userId, movieId, options = {}) {
    const movie = this.getMovieById(movieId);
    if (!movie) {
      throw new Error('Film nenalezen');
    }
    const { status = 'to watch', watchedAt = null, notes = null } = options;
    try {
      this.sqlite.prepare(
        `INSERT INTO watchlists (userId, movieId, status, watchedAt, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?)`
      ).run(Number(userId), Number(movieId), status, watchedAt, notes, new Date().toISOString());
    } catch (error) {
      if (error.message.includes('UNIQUE')) {
        return false;
      }
      throw error;
    }
    return true;
  }

  updateWatchlistEntry(userId, movieId, { status, watchedAt, notes }) {
    const existing = this.sqlite
      .prepare('SELECT 1 FROM watchlists WHERE userId = ? AND movieId = ?')
      .get(Number(userId), Number(movieId));
    if (!existing) {
      throw new Error('Záznam v seznamu nebyl nalezen');
    }
    this.sqlite.prepare(
      'UPDATE watchlists SET status = ?, watchedAt = ?, notes = ?, createdAt = ? WHERE userId = ? AND movieId = ?'
    ).run(status || 'to watch', watchedAt || null, notes || null, new Date().toISOString(), Number(userId), Number(movieId));
    return this.getWatchlistEntry(userId, movieId);
  }

  removeFromWatchlist(userId, movieId) {
    this.sqlite.prepare('DELETE FROM watchlists WHERE userId = ? AND movieId = ?').run(Number(userId), Number(movieId));
    return true;
  }

  isWatchlisted(userId, movieId) {
    const row = this.sqlite.prepare('SELECT 1 FROM watchlists WHERE userId = ? AND movieId = ?').get(Number(userId), Number(movieId));
    return !!row;
  }

  getReviewComments(reviewId) {
    return this.sqlite
      .prepare(
        `SELECT rc.*, u.username AS username
         FROM review_comments rc
         LEFT JOIN users u ON u.id = rc.userId
         WHERE rc.reviewId = ?
         ORDER BY rc.createdAt ASC`
      )
      .all(Number(reviewId));
  }

  createReviewComment(reviewId, userId, comment) {
    const existingReview = this.db.select().from(reviews).where(eq(reviews.id, Number(reviewId))).get();
    if (!existingReview) {
      throw new Error('Recenze nenalezena');
    }
    const result = this.sqlite.prepare(
      'INSERT INTO review_comments (reviewId, userId, comment, createdAt) VALUES (?, ?, ?, ?)'
    ).run(Number(reviewId), Number(userId), comment, new Date().toISOString());
    return {
      id: Number(result.lastInsertRowid),
      reviewId: Number(reviewId),
      userId: Number(userId),
      comment,
      createdAt: new Date().toISOString()
    };
  }

  reportReview(reviewId, reporterId, reason) {
    const review = this.db.select().from(reviews).where(eq(reviews.id, Number(reviewId))).get();
    if (!review) {
      throw new Error('Recenze nenalezena');
    }
    this.sqlite.prepare(
      'INSERT INTO reports (reviewId, reporterId, reason, createdAt) VALUES (?, ?, ?, ?)'
    ).run(Number(reviewId), Number(reporterId), reason || 'Bez důvodu', new Date().toISOString());
    return true;
  }

  getUserProfile(username) {
    const user = this.getUserByUsername(username);
    if (!user) return null;

    const reviews = this.sqlite
      .prepare(
        `SELECT r.*, m.title AS movieTitle, m.poster AS moviePoster, m.id AS movieId
         FROM reviews r
         JOIN movies m ON m.id = r.movieId
         WHERE r.userId = ?
         ORDER BY r.createdAt DESC`
      )
      .all(user.id);

    const watchlist = this.getWatchlist(user.id);

    const stats = this.sqlite.prepare('SELECT COUNT(*) AS count, AVG(rating) AS average FROM reviews WHERE userId = ?').get(user.id);

    return {
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      reviewCount: Number(stats.count || 0),
      averageRating: stats.count ? Number(stats.average).toFixed(1) : '0.0',
      reviews,
      watchlist,
    };
  }

  getDirectorInfo(directorName) {
    return DIRECTOR_INFO[directorName] || null;
  }

  getActorInfo(actorName) {
    return ACTOR_INFO[actorName] || null;
  }

  close() {
    if (this.sqlite) {
      this.sqlite.close();
    }
  }
}
