// Requiring module
const functions = require("firebase-functions");
const express = require("express");
const app = express();
const bodyParser = require('body-parser');
const sql = require('mssql');
const jwt = require('jsonwebtoken'); // For generating authentication tokens
const axios = require('axios');

app.use(bodyParser.json());
app.use(express.json());

// SQL Server Configuration
const sqlConfig = require("./Config/studentdbazure.json");
const API_PREFIX = '/student/';

const jwtSecret = 'your_jwt_secret';
const API_KEY = 'test';
const STUDENT_ACADEMIC_GET_API_ENDPOINT = 'https://studentmarkdetails-dvd9d8a6gvf4hzcq.canadacentral-01.azurewebsites.net/studentAcadamics/marks/student';
const STUDENT_ACADEMIC_DELETE_API_ENDPOINT = 'https://studentmarkdetails-dvd9d8a6gvf4hzcq.canadacentral-01.azurewebsites.net/studentAcadamics/marks';

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

app.post(API_PREFIX + 'get-login-admin', async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await sql.query`EXEC GetLoginAdmin @UserName=${username}, @PasswordHash=${password};`;
        const ifexists = JSON.stringify(result.recordset)[10];
        console.log(ifexists);
        if (ifexists === "1") {
            // Options for the token, including expiry
            const options = {
                expiresIn: '6h' // Token will expire in 6 hours
            };
            // Generating JWT token
            const token = jwt.sign({ username: username }, jwtSecret, options);
            res.status(200).json({ token: token });
        }
        else {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (err) {
        console.error('Error executing query:', err);
        res.status(500).send('Server error');
    }
});

app.get(API_PREFIX + 'get-student-detail-by-id/:studentid', verifyToken, async (req, res) => {
    try {
        const studentid = req.params['studentid'];
        const result = await sql.query`EXEC GetStudentDetails @StudentID=${studentid};`;
        res.status(200).json(result.recordset); // Send the result set as JSON
    } catch (err) {
        console.error('Error executing query:', err);
        res.status(500).send('Server error');
    }
});

app.get(API_PREFIX + 'get-all-student-details', verifyToken, async (_req, res) => {
    try {
        const result = await sql.query`EXEC GetStudentDetails;`;
        res.status(200).json(result.recordset); // Send the result set as JSON
    } catch (err) {
        console.error('Error executing query:', err);
        res.status(500).send('Server error');
    }
});

app.get(API_PREFIX + 'get-student-detail-and-mark-by-id/:studentid', verifyToken, async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const studentid = req.params['studentid'];
        const result = await sql.query`EXEC GetStudentDetails @StudentID=${studentid};`;
        const StudentAcademicData = await callApi(studentid, authHeader, STUDENT_ACADEMIC_GET_API_ENDPOINT);
        const StudentFirstData = result.recordset
        res.status(200).json({ StudentFirstData, StudentAcademicData }); // Send the result set as JSON
    } catch (err) {
        console.error('Error executing query:', err);
        res.status(500).send('Server error');
    }
});

app.delete(API_PREFIX + 'delete-a-student-all-detail', verifyToken, async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const { studentid } = req.body;
        await sql.query`EXEC DeleteStudentDetailbyStudentID @StudentID=${studentid};`;
        await callApi(studentid, authHeader, STUDENT_ACADEMIC_DELETE_API_ENDPOINT);
        res.status(200).json("Student Detail Deleted Successfully"); // Send the result set as JSON
    } catch (err) {
        console.error('Error executing query:', err);
        res.status(500).send('Server error');
    }
});

async function callApi(studentID, authHeader, apiEndPoint) {
    const url = `${apiEndPoint}/${studentID}`;
    // Defining headers
    const headers = {
        'Authorization': `${authHeader}`,
        'Content-Type': 'application/json',
        'api-key': API_KEY,
    };

    try {
        // Make the API call with headers
        const response = await axios.get(url, {
            headers: headers,
        });
        const data = response.data; // API response data
        console.log('Response:', data);
        // Return or store the data
        return data;
    }
    catch (err) {
        console.log(err);
    }
}

const LocalDebug = true;

if (LocalDebug === true) {
    // Port Number
    const PORT = process.env.PORT || 5000;

    // Server Setup
    app.listen(PORT, console.log(
        `Server started on port ${PORT}`));
}
else {
    // Export the app as a Firebase function
    exports.api = functions.https.onRequest(app);
}