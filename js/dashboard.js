// js/dashboard.js

// PASTE YOUR ACTUAL APP SCRIPT URL HERE
const API_URL = 'https://script.google.com/macros/s/AKfycbypWMCNgDxW0y4VJ8n86oDxN7NM0WewaK02lUXAG9TCk8xGT__dmDE0P4j0fsyfk8WGoQ/exec';

document.addEventListener("DOMContentLoaded", () => {
    // 1. Verify the user is logged in
    const email = sessionStorage.getItem('studentEmail');
    if (!email) {
        // If they try to bypass the login page, kick them back
        window.location.href = 'index.html';
        return;
    }

    // 2. Fetch their data
    loadDashboardData(email);
});

async function loadDashboardData(email) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getDashboardData', email: email })
        });
        
        const data = await response.json();
        
        if (data.success) {
            renderDashboard(data);
        } else {
            alert("Error loading dashboard data.");
        }
    } catch (error) {
        console.error("Failed to fetch dashboard:", error);
        document.getElementById('live-exams-list').innerHTML = "<li>Network error. Could not load exams.</li>";
    }
}

function renderDashboard(data) {
    // Set Welcome Header (Uses Name if available, otherwise Email)
    const displayName = data.studentName && data.studentName.trim() !== '' ? data.studentName : data.student;
    document.getElementById('welcome-text').innerText = `Welcome, ${displayName}`;
    document.getElementById('tier-text').innerText = `Current Plan: ${data.accessLevel} Tier`;

    // Render Analytics
    document.getElementById('stat-taken').innerText = data.analytics.examsTaken;
    document.getElementById('stat-avg').innerText = data.analytics.averageScore;

    // Render Live Exams
    const liveList = document.getElementById('live-exams-list');
    liveList.innerHTML = '';
    
    data.availableExams.forEach(exam => {
        // Access Control Logic
        const isLocked = exam.type === 'Premium' && data.accessLevel !== 'Premium';
        let actionHTML = "";
        
        if (isLocked) {
            actionHTML = `<button class="btn-locked" onclick="alert('This is a Premium exam. Please contact admin to upgrade.')">🔒 Locked</button>`;
        } else {
            // Unlocked - Links to the exam wrapper page, passing the exam ID in the URL
            actionHTML = `<a href="exam.html?id=${exam.id}" class="btn-take">Take Exam</a>`;
        }

        liveList.innerHTML += `
            <li>
                <div>
                    <strong>${exam.title}</strong> 
                    <span class="badge ${exam.type.toLowerCase()}">${exam.type}</span>
                </div>
                ${actionHTML}
            </li>
        `;
    });

    if (data.availableExams.length === 0) {
        liveList.innerHTML = "<li>No exams are currently active. Check back later!</li>";
    }

    // Render Past Exams
    const pastList = document.getElementById('past-exams-list');
    pastList.innerHTML = '';
    
    data.pastExams.forEach(exam => {
        const dateStr = new Date(exam.date).toLocaleDateString();
        pastList.innerHTML += `
            <li>
                <div>
                    <strong>Exam ID: ${exam.examId}</strong><br>
                    <small style="color: var(--text-muted);">${dateStr}</small>
                </div>
                <div style="text-align: right;">
                    <strong>Score: ${exam.score}</strong><br>
                    <a href="review.html?id=${exam.examId}" class="btn-small" style="display: inline-block; margin-top: 0.5rem; text-decoration: none; color: white; background: var(--primary-color); border-radius: 4px;">Review Answers</a>
                </div>
            </li>
        `;
    });

    if (data.pastExams.length === 0) {
        pastList.innerHTML = "<li>You haven't taken any exams yet.</li>";
    }
}

function logout() {
    sessionStorage.removeItem('studentEmail');
    window.location.href = 'index.html';
}
