const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./database');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// --- Helper Functions ---

function getDisabledFactors(user_id) {
    const rows = db.prepare('SELECT factor FROM disabled_factors WHERE user_id = ?').all(user_id);
    return new Set(rows.map(r => r.factor));
}

function getUnansweredQuestions(user_id) {
    const disabled = getDisabledFactors(user_id);
    const all_questions = [];
    for (let i = 0; i <= 10; i++) {
        if (disabled.has(i)) continue;
        for (let j = 0; j <= 10; j++) {
            if (disabled.has(j)) continue;
            all_questions.push({ a: i, b: j });
        }
    }

    const answered_questions_rows = db.prepare(`
        SELECT DISTINCT factor_a, factor_b
        FROM results
        WHERE user_id = ?
    `).all(user_id);

    const answered_questions = new Set(answered_questions_rows.map(q => `${q.factor_a},${q.factor_b}`));

    return all_questions.filter(q => !answered_questions.has(`${q.a},${q.b}`));
}


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

app.get('/api/stats/:user_id/pair', (req, res) => {
    const { user_id } = req.params;
    const { a, b } = req.query;

    if (a == null || b == null) {
        res.status(400).json({"error": "Missing factors a and b"});
        return;
    }

    const sql = `
        SELECT
            AVG(time_taken_ms) as avg_time,
            MIN(time_taken_ms) as best_time
        FROM results
        WHERE user_id = ? AND (
            (factor_a = ? AND factor_b = ?) OR
            (factor_a = ? AND factor_b = ?)
        ) AND is_correct = 1
    `;

    try {
        const row = db.prepare(sql).get(user_id, a, b, b, a);
        res.json({
            "message": "success",
            "data": row
        });
    } catch (err) {
        res.status(400).json({"error": err.message});
    }
});

// Settings API
app.get('/api/settings/:user_id/disabled', (req, res) => {
    const { user_id } = req.params;
    try {
        const disabled = getDisabledFactors(user_id);
        res.json({
            "message": "success",
            "data": Array.from(disabled)
        });
    } catch (err) {
        res.status(400).json({"error": err.message});
    }
});

app.post('/api/settings/:user_id/toggle-disable', (req, res) => {
    const { user_id } = req.params;
    const { factor } = req.body;

    if (factor === undefined) {
        res.status(400).json({"error": "Factor is required"});
        return;
    }

    try {
        const exists = db.prepare('SELECT 1 FROM disabled_factors WHERE user_id = ? AND factor = ?').get(user_id, factor);
        
        if (exists) {
            db.prepare('DELETE FROM disabled_factors WHERE user_id = ? AND factor = ?').run(user_id, factor);
        } else {
            db.prepare('INSERT INTO disabled_factors (user_id, factor) VALUES (?, ?)').run(user_id, factor);
        }

        const disabled = getDisabledFactors(user_id);
        res.json({
            "message": "success",
            "data": Array.from(disabled)
        });
    } catch (err) {
        res.status(400).json({"error": err.message});
    }
});

// Questions API
app.get('/api/questions/smart/:user_id', (req, res) => {
    const { user_id } = req.params;
    try {
        const disabled = getDisabledFactors(user_id);
        const rand = Math.random();

        // 1. Try Problematic (40% chance)
        if (rand < 0.4) {
            const problematic = db.prepare(`
                SELECT DISTINCT factor_a, factor_b
                FROM results
                WHERE user_id = ? AND (is_correct = 0 OR time_taken_ms > 5000)
            `).all(user_id)
            .filter(q => !disabled.has(q.factor_a) && !disabled.has(q.factor_b));

            if (problematic.length > 0) {
                const q = problematic[Math.floor(Math.random() * problematic.length)];
                res.json({ "message": "success", "data": { a: q.factor_a, b: q.factor_b } });
                return;
            }
        }

        // 2. Try Unanswered (30% chance OR fallthrough)
        // Combined probability threshold: 0.7 if problematic existed, but if it didn't, we are here anyway.
        // Let's simplify: strict 30% bucket for unanswered?
        // Or priority list?
        // "Prioritises but doesn't only show the new ones"
        // Let's stick to the buckets.
        
        if (rand < 0.7) {
            const unanswered = getUnansweredQuestions(user_id);
            if (unanswered.length > 0) {
                const q = unanswered[Math.floor(Math.random() * unanswered.length)];
                res.json({ "message": "success", "data": q });
                return;
            }
        }

        // 3. Random (Remaining chance OR fallthrough)
        const validFactors = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(f => !disabled.has(f));
        
        if (validFactors.length === 0) {
            res.status(400).json({"error": "All numbers are disabled"});
            return;
        }

        const a = validFactors[Math.floor(Math.random() * validFactors.length)];
        const b = validFactors[Math.floor(Math.random() * validFactors.length)];
        res.json({ "message": "success", "data": { a, b } });

    } catch (err) {
        res.status(400).json({"error": err.message});
    }
});

app.get('/api/questions/lowest-scores/:user_id', (req, res) => {
    const { user_id } = req.params;
    try {
        const disabled = getDisabledFactors(user_id);

        const problematic_questions = db.prepare(`
            SELECT DISTINCT factor_a, factor_b
            FROM results
            WHERE user_id = ? AND (is_correct = 0 OR time_taken_ms > 5000)
        `).all(user_id)
        .filter(q => !disabled.has(q.factor_a) && !disabled.has(q.factor_b));

        if (problematic_questions.length > 0) {
            const next_question = problematic_questions[Math.floor(Math.random() * problematic_questions.length)];
            res.json({ "message": "success", "data": { a: next_question.factor_a, b: next_question.factor_b } });
            return;
        }

        const stats = db.prepare(`
            SELECT
                factor_a,
                factor_b,
                CAST(SUM(is_correct) AS REAL) / COUNT(*) as score
            FROM results
            WHERE user_id = ?
            GROUP BY factor_a, factor_b
        `).all(user_id)
        .filter(s => !disabled.has(s.factor_a) && !disabled.has(s.factor_b));

        if (stats.length === 0) {
            const validFactors = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(f => !disabled.has(f));
            
            if (validFactors.length === 0) {
                res.status(400).json({"error": "All numbers are disabled"});
                return;
            }

            const a = validFactors[Math.floor(Math.random() * validFactors.length)];
            const b = validFactors[Math.floor(Math.random() * validFactors.length)];
            res.json({ "message": "success", "data": { a, b } });
            return;
        }

        let lowest_score = 1;
        stats.forEach(stat => {
            if (stat.score < lowest_score) {
                lowest_score = stat.score;
            }
        });

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
        const unanswered = getUnansweredQuestions(user_id);
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
        const unanswered = getUnansweredQuestions(user_id);
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
