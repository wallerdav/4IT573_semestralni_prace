import { sqliteTable, integer, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull(),
  email: text('email').notNull(),
  password: text('password').notNull(),
  createdAt: text('createdAt').notNull(),
}, (table) => ({
  usernameIndex: uniqueIndex('users_username_unique').on(table.username),
  emailIndex: uniqueIndex('users_email_unique').on(table.email),
}));

export const movies = sqliteTable('movies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  year: integer('year').notNull(),
  director: text('director').notNull(),
  actors: text('actors').notNull(),
  genre: text('genre').notNull(),
  description: text('description').notNull(),
  poster: text('poster').notNull(),
  createdAt: text('createdAt').notNull(),
});

export const reviews = sqliteTable('reviews', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  movieId: integer('movieId').notNull(),
  userId: integer('userId').notNull(),
  rating: integer('rating').notNull(),
  comment: text('comment').notNull(),
  createdAt: text('createdAt').notNull(),
}, (table) => ({
  uniqueReview: uniqueIndex('reviews_movie_user_unique').on(table.movieId, table.userId),
}));

export const reviewComments = sqliteTable('review_comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  reviewId: integer('reviewId').notNull(),
  userId: integer('userId').notNull(),
  comment: text('comment').notNull(),
  createdAt: text('createdAt').notNull(),
});

export const reports = sqliteTable('reports', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  reviewId: integer('reviewId').notNull(),
  reporterId: integer('reporterId').notNull(),
  reason: text('reason').notNull(),
  createdAt: text('createdAt').notNull(),
});

export const watchlists = sqliteTable('watchlists', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('userId').notNull(),
  movieId: integer('movieId').notNull(),
  createdAt: text('createdAt').notNull(),
}, (table) => ({
  uniqueWatchlist: uniqueIndex('watchlists_user_movie_unique').on(table.userId, table.movieId),
}));

export const votes = sqliteTable('votes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  reviewId: integer('reviewId').notNull(),
  userId: integer('userId').notNull(),
  vote: integer('vote').notNull(),
  createdAt: text('createdAt').notNull(),
}, (table) => ({
  uniqueVote: uniqueIndex('votes_review_user_unique').on(table.reviewId, table.userId),
}));
