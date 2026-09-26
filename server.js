const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---- MySQL connection pool (reads config from environment variables) ----
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'taskuser',
  password: process.env.DB_PASSWORD || 'taskpass',
  database: process.env.DB_NAME || 'taskdb',
  waitForConnections: true,
  connectionLimit: 10,
});

// The MySQL container can take a few seconds to become ready, so retry
// the initial connection + table creation instead of crashing immediately.
async function initDb(retries = 15, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await pool.getConnection();
      await conn.query(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          completed BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      conn.release();
      console.log('Connected to MySQL and ensured `tasks` table exists.');
      return;
    } catch (err) {
      console.log(`DB not ready yet (attempt ${attempt}/${retries}): ${err.message}`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('Could not connect to MySQL after multiple retries.');
}

// Health check endpoint (used by Docker/CI to verify the app is alive)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GET all tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST a new task
app.post('/api/tasks', async (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  try {
    const [result] = await pool.query('INSERT INTO tasks (title) VALUES (?)', [title.trim()]);
    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT toggle/update a task
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Task not found' });

    const task = existing[0];
    const completed = typeof req.body.completed === 'boolean' ? req.body.completed : task.completed;
    const title = typeof req.body.title === 'string' && req.body.title.trim() ? req.body.title.trim() : task.title;

    await pool.query('UPDATE tasks SET title = ?, completed = ? WHERE id = ?', [title, completed, req.params.id]);
    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a task
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Task not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback to index.html for any non-API route (simple SPA-style serving)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDb()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Fatal: could not initialize database.', err);
    process.exit(1);
  });
