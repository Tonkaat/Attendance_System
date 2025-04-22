// Save this as 'server.js'
const express = require('express');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;
// Change this line to a directory you're sure has write permissions
const CSV_PATH = path.join(__dirname, 'data', 'attendance.csv');

// Make sure the directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Initialize CSV file if it doesn't exist
if (!fs.existsSync(CSV_PATH)) {
    const headers = 'Student_Surname,Student_Name,Status,CheckInTime,CheckOutTime\n';
    fs.writeFileSync(CSV_PATH, headers);
    console.log(`Created new CSV file at: ${CSV_PATH}`);
}

// Function to read CSV with error handling
function readCSV() {
    try {
        if (!fs.existsSync(CSV_PATH)) {
            console.log(`CSV file doesn't exist, creating new one at: ${CSV_PATH}`);
            const headers = 'Student_Surname,Student_Name,Status,CheckInTime,CheckOutTime\n';
            fs.writeFileSync(CSV_PATH, headers);
            return [];
        }
        
        const data = fs.readFileSync(CSV_PATH, 'utf8');
        const rows = data.split('\n');
        const headers = rows[0].split(',');
        
        const students = [];
        for (let i = 1; i < rows.length; i++) {
            if (rows[i].trim() === '') continue;
            
            // Handle quoted CSV values properly
            let currentRow = rows[i];
            const values = [];
            let inQuotes = false;
            let currentValue = '';
            
            for (let j = 0; j < currentRow.length; j++) {
                const char = currentRow[j];
                
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(currentValue);
                    currentValue = '';
                } else {
                    currentValue += char;
                }
            }
            values.push(currentValue); // Add the last value
            
            const student = {};
            headers.forEach((header, index) => {
                student[header.trim()] = values[index] ? values[index].replace(/^"|"$/g, '') : '';
            });
            
            students.push(student);
        }
        
        return students;
    } catch (error) {
        console.error('Error reading CSV file:', error);
        return [];
    }
}

// Endpoint to get current attendance data
app.get('/api/attendance', (req, res) => {
    try {
        const students = readCSV();
        res.json(students);
    } catch (error) {
        console.error('Error reading attendance data:', error);
        res.status(500).json({ error: 'Failed to read attendance data' });
    }
});

// Endpoint to update attendance data
app.post('/api/attendance', (req, res) => {
    try {
        const students = req.body;
        
        // Validate data
        if (!students || !Array.isArray(students) || students.length === 0) {
            console.error('Invalid student data received:', students);
            return res.status(400).json({ error: 'Invalid student data format' });
        }
        
        console.log(`Saving ${students.length} student records`);
        
        // Convert to CSV format
        const headers = ['Student_Surname', 'Student_Name', 'Status', 'CheckInTime', 'CheckOutTime'];
        
        // Start with headers
        const csvRows = [headers.join(',')];
        
        // Add data rows
        students.forEach(student => {
            const rowValues = headers.map(header => {
                let value = student[header] || '';
                // Escape quotes and wrap in quotes
                value = String(value).replace(/"/g, '""');
                return `"${value}"`;
            });
            csvRows.push(rowValues.join(','));
        });
        
        const csvContent = csvRows.join('\n');
        
        // Write to a temporary file first to avoid conflicts
        const tempPath = path.join(__dirname, 'temp_attendance.csv');
        fs.writeFileSync(tempPath, csvContent);
        
        // Now copy to the main file
        fs.copyFileSync(tempPath, CSV_PATH);
        
        // Clean up the temp file
        try {
            fs.unlinkSync(tempPath);
        } catch (err) {
            console.log('Warning: Could not delete temp file:', err.message);
        }
        
        res.json({ success: true, message: 'Attendance data updated successfully' });
    } catch (error) {
        console.error('Error updating attendance data:', error);
        res.status(500).json({ error: 'Failed to update attendance data: ' + error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`CSV file location: ${CSV_PATH}`);
});