const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./database');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Users API
app.get('/api/users', (req, res) => {
    try {
        const rows = db.prepare("SELECT * FROM users").all();
        res.json({
            "message": "success",
            "data": rows
        });
    } catch (err) {
        res.status(400).json({"error": err.message});
    }
});

app.post('/api/users', (req, res) => {
    const { name, icon } = req.body;
    if (!name) {
        res.status(400).json({"error": "Name is required"});
        return;
    }
    const finalIcon = icon || 'smile'; // default icon
    const sql = 'INSERT INTO users (name, icon) VALUES (?,?)';
    const params = [name, finalIcon];
    try {
        const result = db.prepare(sql).run(params);
        res.json({
            "message": "success",
            "data": {
                "id": result.lastInsertRowid,
                "name": name,
                "icon": finalIcon
            }
        });
    } catch (err) {
        res.status(400).json({"error": err.message});
    }
});

app.put('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const { name, icon } = req.body;

    if (!name) {
        res.status(400).json({"error": "Name is required"});
        return;
    }

    let sql;
    let params;
    if (icon !== undefined) {
        sql = 'UPDATE users SET name = ?, icon = ? WHERE id = ?';
        params = [name, icon, id];
    } else {
        sql = 'UPDATE users SET name = ? WHERE id = ?';
        params = [name, id];
    }

    try {
        const result = db.prepare(sql).run(params);
        if (result.changes === 0) {
            res.status(404).json({"error": "User not found"});
            return;
        }

        const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

        res.json({
            "message": "success",
            "data": updatedUser
        });
    } catch (err) {
        res.status(400).json({"error": err.message});
    }
});

// Results API
app.post('/api/results', (req, res) => {
    const { user_id, factor_a, factor_b, user_answer, time_taken_ms } = req.body;

    if (user_id == null || factor_a == null || factor_b == null || user_answer == null || time_taken_ms == null) {
        res.status(400).json({"error": "Missing required fields"});
        return;
    }

    const correct_answer = factor_a * factor_b;
    const is_correct = (parseInt(user_answer) === correct_answer) ? 1 : 0;

    const sql = `INSERT INTO results (user_id, factor_a, factor_b, user_answer, correct_answer, is_correct, time_taken_ms)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [user_id, factor_a, factor_b, user_answer, correct_answer, is_correct, time_taken_ms];

    try {
        const result = db.prepare(sql).run(params);
        res.json({
            "message": "success",
            "data": {
                "id": result.lastInsertRowid,
                "is_correct": !!is_correct
            }
        });
    } catch (err) {
        res.status(400).json({"error": err.message});
    }
});

// Stats API
app.get('/api/stats/:user_id', (req, res) => {
    const { user_id } = req.params;

    // We want aggregated stats for each combination 0-10 x 0-10
    // But since order doesn't matter for multiplication (2x3 is same as 3x2),
    // we might want to group them or just return raw data and let frontend handle.
    // However, for the grid view, usually 2x3 and 3x2 are distinct cells.

    const sql = `
        SELECT
            factor_a,
            factor_b,
            COUNT(*) as attempts,
            SUM(is_correct) as correct_count,
            AVG(time_taken_ms) as avg_time
        FROM results
        WHERE user_id = ?
        GROUP BY factor_a, factor_b
    `;

    try {
        const rows = db.prepare(sql).all(user_id);
        res.json({
            "message": "success",
            "data": rows
        });
    } catch (err) {
        res.status(400).json({"error": err.message});
    }
});

// Questions API
app.get('/api/questions/lowest-scores/:user_id', (req, res) => {
    const { user_id } = req.params;
    try {
        const stats = db.prepare(`
            SELECT
                factor_a,
                factor_b,
                CAST(SUM(is_correct) AS REAL) / COUNT(*) as score
            FROM results
            WHERE user_id = ?
            GROUP BY factor_a, factor_b
        `).all(user_id);

        if (stats.length === 0) {
            // If no stats, return a random question
            const a = Math.floor(Math.random() * 11);
            const b = Math.floor(Math.random() * 11);
            res.json({ "message": "success", "data": { a, b } });
            return;
        }

        let lowest_score = 1;
        for (const stat of stats) {
            if (stat.score < lowest_score) {
                lowest_score = stat.score;
            }
        }

        const lowest_questions = stats.filter(stat => stat.score === lowest_score);

        const next_question = lowest_questions[Math.floor(Math.random() * lowest_questions.length)];

        res.json({
            "message": "success",
            "data": { a: next_question.factor_a, b: next_question.factor_b }
        });
    } catch (err) {
        res.status(400).json({"error": err.message});
    }
});

app.get('/api/questions/all-remaining/:user_id', (req, res) => {
    const { user_id } = req.params;
    try {
        const all_questions = [];
        for (let i = 0; i <= 10; i++) {
            for (let j = 0; j <= 10; j++) {
                all_questions.push({ a: i, b: j });
            }
        }

        const answered_questions_rows = db.prepare(`
            SELECT DISTINCT factor_a, factor_b
            FROM results
            WHERE user_id = ?
        `).all(user_id);

        const answered_questions = new Set(answered_questions_rows.map(q => `${q.factor_a},${q.factor_b}`));

        const unanswered = all_questions.filter(q => !answered_questions.has(`${q.a},${q.b}`));

        if (unanswered.length === 0) {
            res.json({ "message": "success", "data": null });
            return;
        }

        const next_question = unanswered[Math.floor(Math.random() * unanswered.length)];

        res.json({
            "message": "success",
            "data": next_question
        });
    } catch (err) {
        res.status(400).json({"error": err.message});
    }
});

app.get('/api/unanswered-questions/:user_id', (req, res) => {
    const { user_id } = req.params;
    try {
        const all_questions = [];
        for (let i = 0; i <= 10; i++) {
            for (let j = 0; j <= 10; j++) {
                all_questions.push({ a: i, b: j });
            }
        }

        const answered_questions_rows = db.prepare(`
            SELECT DISTINCT factor_a, factor_b
            FROM results
            WHERE user_id = ?
        `).all(user_id);

        const answered_questions = new Set(answered_questions_rows.map(q => `${q.factor_a},${q.factor_b}`));

        const unanswered = all_questions.filter(q => !answered_questions.has(`${q.a},${q.b}`));

        res.json({
            "message": "success",
            "data": unanswered
        });
    } catch (err) {
        res.status(400).json({"error": err.message});
    }
});


// All other GET requests not handled before will return our React app
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist", "index.html"));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

console.log('index.js loaded');
