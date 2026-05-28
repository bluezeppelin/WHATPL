const { v4: uuidv4 } = require('uuid');
const db = require('./db');

function rowToFollow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    artistName: row.artist_name,
    createdAt: row.created_at,
  };
}

async function findByUserAndArtist(userId, artistName) {
  const [rows] = await db.execute(
    `SELECT * FROM followed_artists WHERE user_id = ? AND LOWER(artist_name) = LOWER(?)`,
    [userId, artistName]
  );
  return rows.length ? rowToFollow(rows[0]) : null;
}

async function getFollowedByUser(userId) {
  const [rows] = await db.execute(
    `SELECT * FROM followed_artists WHERE user_id = ? ORDER BY created_at DESC`, [userId]
  );
  return rows.map(rowToFollow);
}

async function getFollowersByArtistName(artistName) {
  const [rows] = await db.execute(
    `SELECT * FROM followed_artists WHERE LOWER(artist_name) = LOWER(?)`, [artistName]
  );
  return rows.map(rowToFollow);
}

async function addFollow(data) {
  const id = data.id || uuidv4();
  await db.execute(
    `INSERT IGNORE INTO followed_artists (id, user_id, artist_name) VALUES (?, ?, ?)`,
    [id, data.userId, data.artistName]
  );
  return findByUserAndArtist(data.userId, data.artistName); // returns rowToFollow-mapped object
}

async function removeFollow(userId, artistName) {
  await db.execute(
    `DELETE FROM followed_artists WHERE user_id = ? AND LOWER(artist_name) = LOWER(?)`,
    [userId, artistName]
  );
}

module.exports = { findByUserAndArtist, getFollowedByUser, getFollowersByArtistName, addFollow, removeFollow };
