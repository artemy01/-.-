const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "korochki.db");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/** Обёртка с API, совместимым с прежним better-sqlite3 */
function wrapDb(native) {
  return {
    exec(sql) {
      native.exec(sql);
    },
    prepare(sql) {
      const stmt = native.prepare(sql);
      return {
        get(...params) {
          return stmt.get(...params);
        },
        all(...params) {
          return stmt.all(...params);
        },
        run(...params) {
          const result = stmt.run(...params);
          return {
            changes: result.changes,
            lastInsertRowid: Number(result.lastInsertRowid),
          };
        },
      };
    },
    close() {
      native.close();
    },
  };
}

function getDb() {
  ensureDataDir();
  const native = new DatabaseSync(DB_PATH);
  native.exec("PRAGMA foreign_keys = ON");
  return wrapDb(native);
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  login TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  fio TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  course TEXT NOT NULL,
  start_date TEXT NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('cash', 'phone')),
  status TEXT NOT NULL DEFAULT 'Новая' CHECK (
    status IN ('Новая', 'Идет обучение', 'Обучение завершено')
  ),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

CREATE TABLE IF NOT EXISTS feedbacks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback_text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  login TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
);
`;

function initSchema(db) {
  db.exec(SCHEMA);
}

function seedAdmin(db) {
  const bcrypt = require("bcryptjs");
  const hash = bcrypt.hashSync("KorokNET", 10);
  db.prepare(
    `INSERT INTO admins (login, password_hash) VALUES (?, ?)
     ON CONFLICT(login) DO UPDATE SET password_hash = excluded.password_hash`
  ).run("Admin", hash);
}

function initDatabase() {
  const db = getDb();
  initSchema(db);
  seedAdmin(db);
  db.close();
  return DB_PATH;
}

module.exports = {
  getDb,
  initSchema,
  seedAdmin,
  initDatabase,
  DB_PATH,
};
