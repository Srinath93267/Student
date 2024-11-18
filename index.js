// Requiring module
const express = require('express');
const bodyParser = require('body-parser');
const sql = require('mssql');
const jwt = require('jsonwebtoken'); // For generating authentication tokens

// Creating express object
const app = express();
app.use(bodyParser.json())

// SQL Server Configuration
const sqlConfig = require("./Config/studentdb.json");
const API_PREFIX = '/student/';

const jwtSecret = 'your_jwt_secret';

// Connect to SQL Server
sql.connect(sqlConfig, (err) => {
    if (err) {
        console.error('Database connection failed:', err);
    } else {
        console.log('Connected to SQL Server');
    }
});

// Protected route (middleware to verify authorization token)
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, jwtSecret);
        req.userId = decoded.userId; // Attach user ID to the request object
        next();
    } catch (error) {
        console.error(error);
        return res.status(401).json({ message: 'Unauthorized' });
    }
};

//#region Student Details

app.get(API_PREFIX + 'get-student-detail-by-id/:studentid', async (req, res) => {
    try {
        const studentid = req.params['studentid'];
        const result = await sql.query`EXEC GetStudentDetails @StudentID=${studentid};`;
        res.status(200).json(result.recordset); // Send the result set as JSON
    } catch (err) {
        console.error('Error executing query:', err);
        res.status(500).send('Server error');
    }
});

app.get(API_PREFIX + 'get-all-student-details', async (_req, res) => {
    try {
        const result = await sql.query`EXEC GetStudentDetails;`;
        res.status(200).json(result.recordset); // Send the result set as JSON
    } catch (err) {
        console.error('Error executing query:', err);
        res.status(500).send('Server error');
    }
});

//#endregion

// Port Number
const PORT = process.env.PORT || 5000;

// Server Setup
app.listen(PORT, console.log(
    `Server started on port ${PORT}`));