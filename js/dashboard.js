// js/dashboard.js

// PASTE YOUR ACTUAL APP SCRIPT URL HERE
const API_URL = 'https://script.google.com/macros/s/AKfycbypWMCNgDxW0y4VJ8n86oDxN7NM0WewaK02lUXAG9TCk8xGT__dmDE0P4j0fsyfk8WGoQ/exec';

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Verify the user is logged in
    const email = sessionStorage.getItem('studentEmail');
    if (!email) {
        // If they try to bypass the login page, kick them back
        window.location.href = 'index.html';
        return;
    }

    // 2. Fetch their data
    await loadDashboardData(email);
    await fetchAnalytics(email); 
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


async function fetchAnalytics(email) {
    const grid = document.getElementById('analytics-grid');
    const chartDiv = document.getElementById('analytics-chart');
    if (!grid) return;

    const payload = {
        action: 'getAnalytics',
        email: email 
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const result = await response.json();

        if (result.success && result.analytics.length > 0) {
            grid.innerHTML = ""; // Clear loading text
            
            // --- 1. BUILD THE SCORECARDS ---
            result.analytics.forEach(stat => {
                let colorClass = stat.percentile >= 90 ? 'var(--success-color)' : 
                                (stat.percentile >= 70 ? 'var(--primary-color)' : 'var(--text-main)');
                
                const card = document.createElement('div');
                card.style.cssText = "background: #f9fafb; border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem;";
                
                card.innerHTML = `
                    <div style="font-weight: bold; margin-bottom: 0.5rem; color: var(--text-main); font-size: 0.9rem;">${stat.examId}</div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span style="color: var(--text-muted); font-size: 0.85rem;">Your Score:</span>
                        <strong>${stat.score}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span style="color: var(--text-muted); font-size: 0.85rem;">Cohort High:</span>
                        <strong>${stat.highestScore}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; padding-top: 0.5rem; border-top: 1px solid #e5e7eb;">
                        <span style="color: var(--text-muted); font-size: 0.85rem;">Percentile:</span>
                        <strong style="font-size: 1.2rem; color: ${colorClass};">${stat.percentile} PR</strong>
                    </div>
                `;
                grid.appendChild(card);
            });

            // --- 2. BUILD THE PLOTLY CHART ---
            if (chartDiv) {
                // Extract data arrays for Plotly
                const examNames = result.analytics.map(stat => stat.examId);
                const studentScores = result.analytics.map(stat => stat.score);
                const highestScores = result.analytics.map(stat => stat.highestScore);

                // Trace 1: The Student's Scores
                const trace1 = {
                    x: examNames,
                    y: studentScores,
                    name: 'Your Score',
                    type: 'bar',
                    marker: { color: '#3b82f6' } // Matches var(--primary-color)
                };

                // Trace 2: The Cohort Highest Scores
                const trace2 = {
                    x: examNames,
                    y: highestScores,
                    name: 'Highest Score',
                    type: 'bar',
                    marker: { color: '#e5e7eb' } // Muted gray to let the student's score pop
                };

                const plotData = [trace1, trace2];

                const layout = {
                    title: 'Performance Comparison Across Exams',
                    barmode: 'group',
                    paper_bgcolor: 'rgba(0,0,0,0)',
                    plot_bgcolor: 'rgba(0,0,0,0)',
                    margin: { l: 40, r: 20, t: 40, b: 60 },
                    xaxis: { title: 'Exam', tickangle: -45 },
                    yaxis: { title: 'Score' },
                    legend: { orientation: 'h', y: 1.1 }
                };

                const config = { responsive: true, displayModeBar: false };

                Plotly.newPlot('analytics-chart', plotData, layout, config);
            }

        } else {
            grid.innerHTML = "<p style='color: var(--text-muted);'>No exam data available yet. Complete a test to see your analytics!</p>";
        }
    } catch (error) {
        grid.innerHTML = "<p style='color: var(--error-color);'>Failed to load analytics.</p>";
    }
}

function renderDashboard(data) {
    // Set Welcome Header (Uses Name if available, otherwise Email)
    const displayName = data.studentName && data.studentName.trim() !== '' ? data.studentName : data.student;
    document.getElementById('welcome-text').innerText = `Welcome, ${displayName}`;
    document.getElementById('tier-text').innerText = `Current Plan: ${data.accessLevel} Tier`;

    // Render Analytics (NOTE: Ensure 'stat-taken' and 'stat-avg' still exist in your HTML!)
   // if (document.getElementById('stat-taken') && document.getElementById('stat-avg')) {
     //   document.getElementById('stat-taken').innerText = data.analytics.examsTaken;
     //   document.getElementById('stat-avg').innerText = data.analytics.averageScore;
  //  }

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

// Universal Toast Notification Function
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return; // Failsafe

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    toast.innerHTML = `
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    // Auto-remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
