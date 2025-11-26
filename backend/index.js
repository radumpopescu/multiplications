const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Users API
app.get('/users', (req, res) => {
    db.all("SELECT * FROM users", [], (err, rows) => {
        if (err) {
            res.status(400).json({"error": err.message});
            return;
        }
        res.json({
            "message": "success",
            "data": rows
        });
    });
});

app.post('/users', (req, res) => {
    const { name, icon } = req.body;
    if (!name) {
        res.status(400).json({"error": "Name is required"});
        return;
    }
    const finalIcon = icon || 'smile'; // default icon
    const sql = 'INSERT INTO users (name, icon) VALUES (?,?)';
    const params = [name, finalIcon];
    db.run(sql, params, function (err, result) {
        if (err) {
            res.status(400).json({"error": err.message});
            return;
        }
        res.json({
            "message": "success",
            "data": {
                "id": this.lastID,
                "name": name,
                "icon": finalIcon
            }
        });
    });
});

// Results API
app.post('/results', (req, res) => {
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

    db.run(sql, params, function (err, result) {
        if (err) {
            res.status(400).json({"error": err.message});
            return;
        }
        res.json({
            "message": "success",
            "data": {
                "id": this.lastID,
                "is_correct": !!is_correct
            }
        });
    });
});

// Stats API
app.get('/stats/:user_id', (req, res) => {
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
    
    db.all(sql, [user_id], (err, rows) => {
        if (err) {
            res.status(400).json({"error": err.message});
            return;
        }
        
        // Return a map or list
        res.json({
            "message": "success",
            "data": rows
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
