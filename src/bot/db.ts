import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('./src/db/sniper.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS cservice (
    user_id INTEGER PRIMARY KEY,
    rpc_url TEXT,
    ws_url TEXT,
    api_key TEXT,
    wallet TEXT,
    pumpfun BOOLEAN,
    raydium BOOLEAN
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS cbuy (
    user_id INTEGER PRIMARY KEY,
    amount REAL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS csell (
    user_id INTEGER PRIMARY KEY,
    enabled BOOLEAN,
    stop_loss REAL,
    take_profit REAL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS crug (
    user_id INTEGER PRIMARY KEY,
    mode TEXT,
    mint_authority BOOLEAN,
    freeze_authority BOOLEAN,
    allow_insider_topholders BOOLEAN,
    percentage_top_holders REAL,
    total_lp_providers REAL,
    total_market_liquidity REAL,
    total_markets REAL,
    score INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY,
    name TEXT,
    username TEXT,
    api_key TEXT,
    status BOOLEAN,
    created_at TEXT,
    updated_at TEXT
  )`);
});

export default db;