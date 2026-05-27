const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/followedArtists.json');

function readFollows() {
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, '[]', 'utf-8');
  }
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
}

function writeFollows(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function findByUserAndArtist(userId, artistName) {
  const normalized = artistName.toLowerCase();
  return readFollows().find(f => f.userId === userId && f.artistName.toLowerCase() === normalized) || null;
}

function getFollowedByUser(userId) {
  return readFollows().filter(f => f.userId === userId);
}

function getFollowersByArtistName(artistName) {
  const normalized = artistName.toLowerCase();
  return readFollows().filter(f => f.artistName.toLowerCase() === normalized);
}

function addFollow(data) {
  const follows = readFollows();
  follows.push(data);
  writeFollows(follows);
  return data;
}

function removeFollow(userId, artistName) {
  const normalized = artistName.toLowerCase();
  const follows = readFollows();
  writeFollows(follows.filter(f => !(f.userId === userId && f.artistName.toLowerCase() === normalized)));
}

module.exports = { findByUserAndArtist, getFollowedByUser, getFollowersByArtistName, addFollow, removeFollow };
