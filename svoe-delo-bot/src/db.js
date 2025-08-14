import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const dbPath = path.join(process.cwd(), 'data', 'bot.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
	user_id INTEGER PRIMARY KEY,
	username TEXT,
	first_name TEXT,
	last_name TEXT,
	created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS progress (
	user_id INTEGER PRIMARY KEY,
	day INTEGER DEFAULT 1,
	step INTEGER DEFAULT 0,
	updated_at TEXT DEFAULT (datetime('now')),
	FOREIGN KEY(user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS answers (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id INTEGER,
	day INTEGER,
	prompt_index INTEGER,
	answer TEXT,
	created_at TEXT DEFAULT (datetime('now')),
	FOREIGN KEY(user_id) REFERENCES users(user_id)
);
`);

export function upsertUser(user) {
	const stmt = db.prepare(`INSERT INTO users (user_id, username, first_name, last_name)
		VALUES (@id, @username, @first_name, @last_name)
		ON CONFLICT(user_id) DO UPDATE SET username=excluded.username, first_name=excluded.first_name, last_name=excluded.last_name`);
	stmt.run({
		id: user.id,
		username: user.username ?? null,
		first_name: user.first_name ?? null,
		last_name: user.last_name ?? null,
	});
}

export function getProgress(userId) {
	const row = db.prepare('SELECT day, step FROM progress WHERE user_id = ?').get(userId);
	return row ?? { day: 1, step: 0 };
}

export function setProgress(userId, day, step) {
	db.prepare(`INSERT INTO progress (user_id, day, step, updated_at)
		VALUES (?, ?, ?, datetime('now'))
		ON CONFLICT(user_id) DO UPDATE SET day=excluded.day, step=excluded.step, updated_at=excluded.updated_at`).run(userId, day, step);
}

export function saveAnswer(userId, day, promptIndex, answer) {
	db.prepare('INSERT INTO answers (user_id, day, prompt_index, answer) VALUES (?, ?, ?, ?)')
		.run(userId, day, promptIndex, answer);
}

export function getAnswersByDay(userId, day) {
	return db.prepare('SELECT prompt_index, answer FROM answers WHERE user_id = ? AND day = ? ORDER BY prompt_index').all(userId, day);
}

export function getAllAnswers(userId) {
	return db.prepare('SELECT day, prompt_index, answer FROM answers WHERE user_id = ? ORDER BY day, prompt_index').all(userId);
}