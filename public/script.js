// DOM Elements
const checkInBtn = document.getElementById('checkInBtn');
const checkOutBtn = document.getElementById('checkOutBtn');
const confirmModal = document.getElementById('confirmModal');
const confirmMessage = document.getElementById('confirmMessage');
const confirmBtn = document.getElementById('confirmBtn');
const cancelBtn = document.getElementById('cancelBtn');
const surnameInput = document.getElementById('surname');
const nameInput = document.getElementById('name');
const notification = document.getElementById('notification');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const studentTableBody = document.getElementById('studentTableBody');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

// Student data array (will be loaded from server)
let studentData = [
    // Default data in case server load fails
    { Student_Surname: "Smith", Student_Name: "J", Status: "none", CheckInTime: "", CheckOutTime: "" },
    { Student_Surname: "Johnson", Student_Name: "A", Status: "none", CheckInTime: "", CheckOutTime: "" }
];

// Action state (check-in or check-out)
let currentAction = '';
let selectedStudent = null;

// Tab switching
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(tc => tc.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
        
        if(tab.dataset.tab === 'search') {
            renderStudentTable();
        }
    });
});

// Load data from server when page loads
window.addEventListener('DOMContentLoaded', () => {
    loadDataFromServer();
});

function loadDataFromServer() {
    fetch('http://localhost:3000/api/attendance')
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                // Transform data to match our new structure if needed
                studentData = data.map(student => {
                    // Handle legacy data format
                    if (!student.CheckInTime && !student.CheckOutTime && student.Timestamp) {
                        if (student.Status === 'checked in') {
                            student.CheckInTime = student.Timestamp;
                            student.CheckOutTime = "";
                        } else if (student.Status === 'checked out') {
                            student.CheckInTime = "";  // We don't know when they checked in
                            student.CheckOutTime = student.Timestamp;
                        }
                    }
                    
                    // Ensure we have the new fields
                    return {
                        Student_Surname: student.Student_Surname || "",
                        Student_Name: student.Student_Name || "",
                        Status: student.Status || "none",
                        CheckInTime: student.CheckInTime || student.Timestamp || "",
                        CheckOutTime: student.CheckOutTime || ""
                    };
                });
                console.log('Loaded data from server:', studentData);
                renderStudentTable();
            } else {
                console.log('No data from server or empty array, using default data');
            }
        })
        .catch(error => {
            console.error('Error loading data from server:', error);
            console.log('Using default data instead');
            renderStudentTable();
        });
}

// Event Listeners
checkInBtn.addEventListener('click', () => {
    if (validateInputs()) {
        currentAction = 'checkin';
        confirmMessage.textContent = 'Are you sure you want to check in?';
        confirmModal.style.display = 'flex';
    }
});

checkOutBtn.addEventListener('click', () => {
    if (validateInputs()) {
        currentAction = 'checkout';
        confirmMessage.textContent = 'Are you sure you want to check out?';
        confirmModal.style.display = 'flex';
    }
});

confirmBtn.addEventListener('click', () => {
    processAttendance();
    confirmModal.style.display = 'none';
});

cancelBtn.addEventListener('click', () => {
    confirmModal.style.display = 'none';
});

searchBtn.addEventListener('click', () => {
    searchStudents();
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchStudents();
    }
});

// Functions
function validateInputs() {
    const surname = surnameInput.value.trim();
    const nameInitial = nameInput.value.trim();

    if (!surname || !nameInitial) {
        showNotification('Please enter both surname and first name initial.', true);
        return false;
    }
    return true;
}

function processAttendance() {
    const surname = surnameInput.value.trim();
    const nameInitial = nameInput.value.trim();
    
    // Find student in data
    let student = findStudent(surname, nameInitial);
    
    if (!student) {
        // If student not found, add them to the database
        student = {
            Student_Surname: surname,
            Student_Name: nameInitial,
            Status: 'none',
            CheckInTime: "",
            CheckOutTime: ""
        };
        studentData.push(student);
        console.log('New student added to database');
    }

    const currentTime = new Date().toLocaleString();

    if (currentAction === 'checkin') {
        if (student.Status === 'checked in') {
            showNotification('You are already checked in!', true);
            return;
        } else {
            student.Status = 'checked in';
            student.CheckInTime = currentTime;
            showNotification('Successfully checked in!');
        }
    } else if (currentAction === 'checkout') {
        if (student.Status === 'checked out' || student.Status === 'none') {
            showNotification('You haven\'t checked in yet or already checked out!', true);
            return;
        } else {
            student.Status = 'checked out';
            student.CheckOutTime = currentTime;
            showNotification('Successfully checked out!');
        }
    }
    
    // Save data after any successful change
    saveData();
    
    // Update the table if we're on the search tab
    if (document.querySelector('.tab[data-tab="search"]').classList.contains('active')) {
        renderStudentTable();
    }
    
    // Clear the form
    surnameInput.value = '';
    nameInput.value = '';
    selectedStudent = null;
}

function findStudent(surname, nameInitial) {
    return studentData.find(student => 
        student.Student_Surname.toLowerCase() === surname.toLowerCase() && 
        student.Student_Name.toLowerCase() === nameInitial.toLowerCase()
    );
}

function showNotification(message, isError = false) {
    notification.textContent = message;
    notification.className = isError ? 'notification error' : 'notification';
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

function saveData() {
    // Send data to server
    fetch('http://localhost:3000/api/attendance', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(studentData)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            console.log('Data saved to server and CSV successfully!');
        } else {
            console.error('Error saving data:', result.error);
            showNotification('Error saving data. Please try again.', true);
        }
    })
    .catch(error => {
        console.error('Error saving data to server:', error);
        showNotification('Could not connect to server. Please try again.', true);
    });
}

function renderStudentTable() {
    // Clear existing table rows
    studentTableBody.innerHTML = '';
    
    // Create table rows for each student
    studentData.forEach(student => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${student.Student_Surname}</td>
            <td>${student.Student_Name}</td>
            <td class="status-${student.Status.replace(' ', '-')}">${student.Status}</td>
            <td>${student.CheckInTime}</td>
            <td>${student.CheckOutTime}</td>
        `;
        
        // Add click event to select the student
        row.addEventListener('click', () => {
            selectedStudent = student;
            surnameInput.value = student.Student_Surname;
            nameInput.value = student.Student_Name;
            
            // Switch to registration tab
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));
            
            document.querySelector('.tab[data-tab="registration"]').classList.add('active');
            document.getElementById('tab-registration').classList.add('active');
            
            // Focus on appropriate button based on status
            if (student.Status === 'checked in') {
                checkOutBtn.focus();
            } else {
                checkInBtn.focus();
            }
        });
        
        studentTableBody.appendChild(row);
    });
}

function searchStudents() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    if (!searchTerm) {
        renderStudentTable();
        return;
    }
    
    // Filter students based on search term
    const filteredStudents = studentData.filter(student => 
        student.Student_Surname.toLowerCase().includes(searchTerm) || 
        student.Student_Name.toLowerCase().includes(searchTerm)
    );
    
    // Clear existing table rows
    studentTableBody.innerHTML = '';
    
    if (filteredStudents.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="5" style="text-align: center;">No matching students found</td>`;
        studentTableBody.appendChild(row);
        return;
    }
    
    // Create table rows for filtered students
    filteredStudents.forEach(student => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${student.Student_Surname}</td>
            <td>${student.Student_Name}</td>
            <td class="status-${student.Status.replace(' ', '-')}">${student.Status}</td>
            <td>${student.CheckInTime}</td>
            <td>${student.CheckOutTime}</td>
        `;
        
        // Add click event to select the student
        row.addEventListener('click', () => {
            selectedStudent = student;
            surnameInput.value = student.Student_Surname;
            nameInput.value = student.Student_Name;
            
            // Switch to registration tab
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));
            
            document.querySelector('.tab[data-tab="registration"]').classList.add('active');
            document.getElementById('tab-registration').classList.add('active');
            
            // Focus on appropriate button based on status
            if (student.Status === 'checked in') {
                checkOutBtn.focus();
            } else {
                checkInBtn.focus();
            }
        });
        
        studentTableBody.appendChild(row);
    });
}