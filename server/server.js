import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createAdaptorServer } from '@hono/node-server';
import bcrypt from 'bcrypt';
import { WebSocketServer } from 'ws';
import Database from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sessions = new Map();

function generateSessionId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function parseCookies(request) {
  const cookies = {};
  const cookieHeader = request?.header?.('cookie') ?? request?.headers?.get?.('cookie') ?? request?.headers?.cookie ?? request?.raw?.headers?.cookie ?? '';
  if (cookieHeader) {
    cookieHeader.split(';').forEach((cookie) => {
      const [name, value] = cookie.trim().split('=');
      cookies[name] = value;
    });
  }
  return cookies;
}

function getSession(request) {
  const cookies = parseCookies(request);
  const sessionId = cookies.sessionId;
  return sessionId ? sessions.get(sessionId) : null;
}

function setSession(c, sessionData) {
  const sessionId = generateSessionId();
  sessions.set(sessionId, sessionData);
  c.header('Set-Cookie', `sessionId=${sessionId}; HttpOnly; Path=/; Max-Age=86400`);
  return sessionId;
}

function destroySession(c) {
  const cookies = parseCookies(c.req);
  const sessionId = cookies.sessionId;
  if (sessionId) {
    sessions.delete(sessionId);
    c.header('Set-Cookie', 'sessionId=; HttpOnly; Path=/; Max-Age=0');
  }
}

function sendJSON(statusCode, data, headers = {}) {
  return new Response(JSON.stringify(data), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

async function serveFile(filePath, contentType) {
  try {
    const content = await fs.readFile(filePath);
    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return sendJSON(404, { error: 'Soubor nenalezen' });
    }
    return sendJSON(500, { error: 'Chyba serveru' });
  }
}

function createServer() {
  const db = new Database(process.env.DB_PATH);
  const app = new Hono();

  app.use('*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'OPTIONS'], allowHeaders: ['Content-Type'] }));

  app.post('/api/register', async (c) => {
    let body;
    try {
      body = await c.req.json();
    } catch {
      return sendJSON(400, { error: 'Invalid JSON' });
    }

    const { username, email, password } = body;
    if (!username || !email || !password) {
      return sendJSON(400, { error: 'Všechna pole jsou povinná' });
    }

    if (password.length < 6) {
      return sendJSON(400, { error: 'Heslo musí mít alespoň 6 znaků' });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = db.createUser(username, email, hashedPassword);
      setSession(c, { userId: user.id, username: user.username });
      return c.json({ message: 'Registrace úspěšná', user: { id: user.id, username: user.username } }, 201);
    } catch (error) {
      return sendJSON(400, { error: error.message });
    }
  });

  app.post('/api/login', async (c) => {
    let body;
    try {
      body = await c.req.json();
    } catch {
      return sendJSON(400, { error: 'Invalid JSON' });
    }

    const { username, password } = body;
    if (!username || !password) {
      return sendJSON(400, { error: 'Vyplňte všechna pole' });
    }

    const user = db.getUserByUsername(username);
    if (!user) {
      return sendJSON(401, { error: 'Nesprávné přihlašovací údaje' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return sendJSON(401, { error: 'Nesprávné přihlašovací údaje' });
    }

    setSession(c, { userId: user.id, username: user.username });
    return c.json({ message: 'Přihlášení úspěšné', user: { id: user.id, username: user.username } }, 200);
  });

  app.post('/api/logout', (c) => {
    destroySession(c);
    return c.json({ message: 'Odhlášení úspěšné' }, 200);
  });

  app.get('/api/me', (c) => {
    const session = getSession(c.req);
    if (session) {
      return c.json({ loggedIn: true, user: { id: session.userId, username: session.username } }, 200);
    }
    return c.json({ loggedIn: false }, 200);
  });

  app.get('/api/movies', (c) => {
    const q = (c.req.query('q') || '').trim().toLowerCase();
    const genre = (c.req.query('genre') || '').trim().toLowerCase();
    const year = c.req.query('year') ? Number(c.req.query('year')) : null;
    const minRating = c.req.query('minRating') ? Number(c.req.query('minRating')) : 0;
    const sort = c.req.query('sort') || 'year';

    let movies = db.getAllMovies();

    if (q) {
      movies = movies.filter((m) =>
        m.title.toLowerCase().includes(q) ||
        m.director.toLowerCase().includes(q) ||
        m.genre.toLowerCase().includes(q) ||
        m.actors.join(' ').toLowerCase().includes(q)
      );
    }

    if (genre) {
      movies = movies.filter((m) => m.genre.toLowerCase() === genre);
    }

    if (year) {
      movies = movies.filter((m) => m.year === year);
    }

    const enriched = movies.map((m) => {
      const rating = db.getAverageRating(m.id);
      return { ...m, averageRating: rating.average, reviewCount: rating.count };
    }).filter((m) => Number(m.averageRating) >= minRating);

    if (sort === 'popularity') {
      enriched.sort((a, b) => Number(b.reviewCount) - Number(a.reviewCount));
    } else if (sort === 'rating') {
      enriched.sort((a, b) => Number(b.averageRating) - Number(a.averageRating));
    } else if (sort === 'title') {
      enriched.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      enriched.sort((a, b) => b.year - a.year);
    }

    return c.json(enriched, 200);
  });

  app.get('/api/movies/search', (c) => {
    const query = c.req.query('q') || '';
    return c.json(db.searchMovies(query), 200);
  });

  app.get('/api/movies/trending', (c) => {
    return c.json(db.getTrendingMovies(6), 200);
  });

  app.get('/api/movies/:id', (c) => {
    const movieId = c.req.param('id');
    const movie = db.getMovieById(movieId);

    if (!movie) {
      return sendJSON(404, { error: 'Film nenalezen' });
    }

    const reviews = db.getReviewsByMovieId(movieId);
    const rating = db.getAverageRating(movieId);
    const similar = db.getSimilarMovies(movieId);
    const session = getSession(c.req);

    if (session) {
      reviews.forEach((review) => {
        review.userVote = db.getUserVote(review.id, session.userId);
      });
    }

    return c.json({ ...movie, averageRating: rating.average, reviewCount: rating.count, reviews, similar }, 200);
  });

  app.get('/api/recommendations', (c) => {
    const session = getSession(c.req);
    if (!session) {
      return sendJSON(401, { error: 'Musíte být přihlášeni' });
    }

    return c.json(db.getRecommendations(session.userId, 6), 200);
  });

  app.get('/api/users/:username', (c) => {
    const username = c.req.param('username');
    const profile = db.getUserProfile(username);
    if (!profile) {
      return sendJSON(404, { error: 'Uživatel nenalezen' });
    }

    const session = getSession(c.req);
    return c.json({ ...profile, currentUser: session ? session.username : null }, 200);
  });

  app.get('/api/watchlist', (c) => {
    const session = getSession(c.req);
    if (!session) {
      return sendJSON(401, { error: 'Musíte být přihlášeni' });
    }

    return c.json(db.getWatchlist(session.userId), 200);
  });

  app.get('/api/watchlist/:movieId', (c) => {
    const session = getSession(c.req);
    if (!session) {
      return sendJSON(401, { error: 'Musíte být přihlášeni' });
    }

    const movieId = c.req.param('movieId');
    const entry = db.getWatchlistEntry(session.userId, movieId);
    if (!entry) {
      return sendJSON(404, { error: 'Záznam v seznamu nenalezen' });
    }
    return c.json(entry, 200);
  });

  app.post('/api/watchlist', async (c) => {
    const session = getSession(c.req);
    if (!session) {
      return sendJSON(401, { error: 'Musíte být přihlášeni' });
    }

    let body;
    try {
      body = await c.req.json();
    } catch {
      return sendJSON(400, { error: 'Invalid JSON' });
    }

    const { movieId, status, watchedAt, notes } = body;
    if (!movieId) {
      return sendJSON(400, { error: 'movieId je povinné' });
    }

    try {
      const added = db.addToWatchlist(session.userId, movieId, { status, watchedAt, notes });
      if (!added) {
        return sendJSON(409, { error: 'Film je již v seznamu. Použijte aktualizaci.' });
      }
      return c.json({ message: 'Film přidán do seznamu' }, 200);
    } catch (error) {
      return sendJSON(400, { error: error.message });
    }
  });

  app.patch('/api/watchlist/:movieId', async (c) => {
    const session = getSession(c.req);
    if (!session) {
      return sendJSON(401, { error: 'Musíte být přihlášeni' });
    }

    let body;
    try {
      body = await c.req.json();
    } catch {
      return sendJSON(400, { error: 'Invalid JSON' });
    }

    const movieId = c.req.param('movieId');
    const { status, watchedAt, notes } = body;

    try {
      const updated = db.updateWatchlistEntry(session.userId, movieId, { status, watchedAt, notes });
      return c.json(updated, 200);
    } catch (error) {
      return sendJSON(400, { error: error.message });
    }
  });

  app.delete('/api/watchlist/:movieId', (c) => {
    const session = getSession(c.req);
    if (!session) {
      return sendJSON(401, { error: 'Musíte být přihlášeni' });
    }

    const movieId = c.req.param('movieId');
    db.removeFromWatchlist(session.userId, movieId);
    return c.json({ message: 'Film odebrán ze seznamu' }, 200);
  });

  app.get('/api/reviews/:id/comments', (c) => {
    const reviewId = c.req.param('id');
    return c.json(db.getReviewComments(reviewId), 200);
  });

  app.post('/api/reviews/:id/comments', async (c) => {
    const session = getSession(c.req);
    if (!session) {
      return sendJSON(401, { error: 'Musíte být přihlášeni' });
    }

    let body;
    try {
      body = await c.req.json();
    } catch {
      return sendJSON(400, { error: 'Invalid JSON' });
    }

    const comment = body.comment;
    if (!comment || comment.length < 3) {
      return sendJSON(400, { error: 'Komentář musí mít alespoň 3 znaky' });
    }

    try {
      const newComment = db.createReviewComment(c.req.param('id'), session.userId, comment);
      return c.json(newComment, 201);
    } catch (error) {
      return sendJSON(400, { error: error.message });
    }
  });

  app.post('/api/reviews/:id/report', async (c) => {
    const session = getSession(c.req);
    if (!session) {
      return sendJSON(401, { error: 'Musíte být přihlášeni' });
    }

    let body;
    try {
      body = await c.req.json();
    } catch {
      return sendJSON(400, { error: 'Invalid JSON' });
    }

    const reason = body.reason || 'Nahlášeno uživatelem';
    try {
      db.reportReview(c.req.param('id'), session.userId, reason);
      return c.json({ message: 'Recenze byla nahlášena' }, 200);
    } catch (error) {
      return sendJSON(400, { error: error.message });
    }
  });

  app.post('/api/reviews', async (c) => {
    const session = getSession(c.req);
    if (!session) {
      return sendJSON(401, { error: 'Musíte být přihlášeni' });
    }

    let body;
    try {
      body = await c.req.json();
    } catch {
      return sendJSON(400, { error: 'Invalid JSON' });
    }

    const { movieId, rating, comment } = body;
    if (!movieId || !rating || !comment) {
      return sendJSON(400, { error: 'Všechna pole jsou povinná' });
    }

    if (rating < 1 || rating > 10) {
      return sendJSON(400, { error: 'Hodnocení musí být mezi 1 a 10' });
    }

    if (comment.length < 10) {
      return sendJSON(400, { error: 'Komentář musí mít alespoň 10 znaků' });
    }

    try {
      db.createReview(movieId, session.userId, parseInt(rating, 10), comment);
      broadcastWS({ type: 'new_review', movieId: Number(movieId), username: session.username });
      return c.json({ message: 'Recenze přidána' }, 201);
    } catch (error) {
      return sendJSON(400, { error: error.message });
    }
  });

  app.post('/api/reviews/:id/vote', async (c) => {
    const session = getSession(c.req);
    if (!session) {
      return sendJSON(401, { error: 'Musíte být přihlášeni' });
    }

    let body;
    try {
      body = await c.req.json();
    } catch {
      return sendJSON(400, { error: 'Invalid JSON' });
    }

    const reviewId = Number(c.req.param('id'));
    const { vote } = body;
    if (vote !== 1 && vote !== -1) {
      return sendJSON(400, { error: 'Hlas musí být 1 nebo -1' });
    }

    try {
      db.voteReview(reviewId, session.userId, vote);
      broadcastWS({ type: 'review_voted', reviewId });
      return c.json({ message: 'Hlas zaznamenán' }, 200);
    } catch (error) {
      return sendJSON(400, { error: error.message });
    }
  });

  app.get('/api/stats', (c) => c.json(db.getStats(), 200));

  app.get('/api/directors/:name', (c) => {
    const directorName = decodeURIComponent(c.req.param('name'));
    const directorInfo = db.getDirectorInfo(directorName);

    if (!directorInfo) {
      return sendJSON(404, { error: 'Režisér nenalezen' });
    }

    return c.json({
      name: directorName,
      ...directorInfo
    }, 200);
  });

  app.get('/api/actors/:name', (c) => {
    const actorName = decodeURIComponent(c.req.param('name'));
    const actorInfo = db.getActorInfo(actorName);
    const movies = db.getAllMovies().filter((movie) => movie.actors.includes(actorName));

    if (!actorInfo) {
      return sendJSON(404, { error: 'Herec nenalezen' });
    }

    return c.json({
      name: actorName,
      ...actorInfo,
      movies,
    }, 200);
  });

  app.get('/', () => serveFile(path.join(__dirname, '../public/index.html'), 'text/html'));
  app.get('/index.html', () => serveFile(path.join(__dirname, '../public/index.html'), 'text/html'));
  app.get('/movie.html', () => serveFile(path.join(__dirname, '../public/movie.html'), 'text/html'));
  app.get('/director.html', () => serveFile(path.join(__dirname, '../public/director.html'), 'text/html'));
  app.get('/actor.html', () => serveFile(path.join(__dirname, '../public/actor.html'), 'text/html'));
  app.get('/profile', (c) => c.redirect('/profile.html'));
  app.get('/profile.html', () => serveFile(path.join(__dirname, '../public/profile.html'), 'text/html'));
  app.get('/movie.html', () => serveFile(path.join(__dirname, '../public/movie.html'), 'text/html'));
  app.get('/director.html', () => serveFile(path.join(__dirname, '../public/director.html'), 'text/html'));
  app.get('/style.css', () => serveFile(path.join(__dirname, '../public/style.css'), 'text/css'));
  app.get('/app.js', () => serveFile(path.join(__dirname, '../public/app.js'), 'application/javascript'));

  app.all('*', () => sendJSON(404, { error: 'Stránka nenalezena' }));

  const server = createAdaptorServer({ fetch: app.fetch, createServer: http.createServer, serverOptions: {} });
  const wss = new WebSocketServer({ server });

  const originalClose = server.close.bind(server);
  server.close = (callback) => {
    try {
      db.close();
    } catch {
      // ignore close errors
    }
    return originalClose(callback);
  };

  function broadcastWS(data) {
    const message = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(message);
      }
    });
  }

  wss.on('connection', (ws) => {
    console.log('✓ Nové WebSocket připojení');

    ws.on('message', (message) => {
      console.log('Přijata zpráva:', message.toString());
    });

    ws.on('close', () => {
      console.log('✗ WebSocket odpojeno');
    });

    ws.send(JSON.stringify({ type: 'connected', message: 'Připojeno k serveru' }));
  });

  server.shutdown = () => new Promise((resolve) => {
    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.terminate();
      }
    });
    wss.close();
    server.close(resolve);
  });

  return server;
}

export default createServer;
