const express = require('express');
const { pool } = require('../config/db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken); // every route below requires a valid login

// GET all tasks for the logged-in user, with optional filters
// e.g. /api/tasks?category=3&completed=false&priority=high
router.get('/', async (req, res) => {
  try {
    let sql = `
      SELECT t.*, c.name AS category_name, c.color AS category_color
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
    `;
    const params = [req.userId];

    if (req.query.category) {
      sql += ' AND t.category_id = ?';
      params.push(req.query.category);
    }
    if (req.query.completed === 'true' || req.query.completed === 'false') {
      sql += ' AND t.completed = ?';
      params.push(req.query.completed === 'true');
    }
    if (req.query.priority) {
      sql += ' AND t.priority = ?';
      params.push(req.query.priority);
    }

    sql += ' ORDER BY (t.due_date IS NULL), t.due_date ASC, t.created_at DESC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST a new task
router.post('/', async (req, res) => {
  const { title, description, priority, due_date, category_id } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required.' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO tasks (user_id, category_id, title, description, priority, due_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.userId,
        category_id || null,
        title.trim(),
        description || null,
        priority || 'medium',
        due_date || null,
      ]
    );
    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update a task (partial updates supported)
router.put('/:id', async (req, res) => {
  try {
    const [existing] = await pool.query(
      'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );
    if (existing.length === 0) return res.status(404).json({ error: 'Task not found.' });

    const task = existing[0];
    const updated = {
      title: req.body.title !== undefined ? req.body.title.trim() : task.title,
      description: req.body.description !== undefined ? req.body.description : task.description,
      priority: req.body.priority !== undefined ? req.body.priority : task.priority,
      due_date: req.body.due_date !== undefined ? req.body.due_date : task.due_date,
      category_id: req.body.category_id !== undefined ? req.body.category_id : task.category_id,
      completed: req.body.completed !== undefined ? req.body.completed : task.completed,
    };

    await pool.query(
      `UPDATE tasks SET title=?, description=?, priority=?, due_date=?, category_id=?, completed=?
       WHERE id = ? AND user_id = ?`,
      [
        updated.title,
        updated.description,
        updated.priority,
        updated.due_date,
        updated.category_id,
        updated.completed,
        req.params.id,
        req.userId,
      ]
    );

    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a task
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM tasks WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Task not found.' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
