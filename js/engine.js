// PASTE YOUR ACTUAL APP SCRIPT URL HERE
const API_URL = 'https://script.google.com/macros/s/AKfycbypWMCNgDxW0y4VJ8n86oDxN7NM0WewaK02lUXAG9TCk8xGT__dmDE0P4j0fsyfk8WGoQ/exec';

let currentExamId = "";
let studentEmail = "";

document.addEventListener("DOMContentLoaded", () => {
    studentEmail = sessionStorage.getItem('studentEmail');
    
    // Security check: Must be logged in
    if (!studentEmail) {
        window.location.href = 'index.html';
        return;
    }

    // Get Exam ID from URL (e.g., exam.html?id=jee-mock-1)
    const urlParams = new URLSearchParams(window.location.search);
    currentExamId = urlParams.get('id');

    if (!currentExamId) {
        document.getElementById("exam-container").innerHTML = "<h3>Error: No exam specified.</h3>";
        return;
    }

    // Update Title (You can refine this to fetch the real title from the dashboard later)
    document.getElementById("exam-title").innerText = `Exam: ${currentExamId.toUpperCase()}`;
    
    loadExamData();
});

async function loadExamData() {
    try {
        const response = await fetch(`data/${currentExamId}.json`);
        if (!response.ok) throw new Error("Exam file not found");
        
        // 1. Parse the new JSON structure
        const examData = await response.json();
        
        // 2. Set the duration (Convert minutes from JSON into seconds)
        // If you forget to put a duration in the JSON, it defaults to 60 minutes
        examDuration = (examData.duration || 60) * 60; 

        // 3. CHECK PERSISTENT TIMER (Refresh-proof logic)
        const startTimeKey = `start_time_${currentExamId}`;
        const savedStartTime = localStorage.getItem(startTimeKey);

        if (savedStartTime) {
            const elapsed = Math.floor((Date.now() - parseInt(savedStartTime)) / 1000);
            timeRemaining = examDuration - elapsed;
            
            // If they refreshed after time expired, force submit
            if (timeRemaining <= 0) {
                alert("Your time expired while you were away.");
                submitExam();
                return;
            }
        } else {
            // First time loading the exam
            localStorage.setItem(startTimeKey, Date.now().toString());
            timeRemaining = examDuration;
        }

        // 4. Pass only the questions array to the renderer
        renderQuestions(examData.questions);
        
    } catch (error) {
        document.getElementById("exam-container").innerHTML = `<h3>Error loading exam.</h3><p>${error.message}</p>`;
    }
}

function renderQuestions(questions) {
    const container = document.getElementById('exam-container');
    container.innerHTML = ""; // Clear loading text
    
    questions.forEach((q, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'panel'; // Using the panel class from your CSS
        wrapper.style.marginBottom = "2rem";
        
        let html = `<h4>Question ${index + 1} <span class="badge ${q.type.toLowerCase()}">${q.type}</span></h4>`;
        html += `<div id="math-q-${index}" style="margin: 1rem 0; font-size: 1.1rem;">${q.text}</div>`;
        
        // --- Input Generation based on Type ---
        if (q.type === 'SCQ') {
            html += `<ul class="exam-list" style="padding-left: 0;">`;
            q.options.forEach((opt, optIndex) => {
                html += `
                <li style="justify-content: flex-start; gap: 1rem; cursor: pointer;">
                    <input type="radio" name="${q.id}" value="${optIndex}" id="opt-${q.id}-${optIndex}"> 
                    <label for="opt-${q.id}-${optIndex}" id="math-opt-${index}-${optIndex}" style="cursor: pointer; width: 100%;">${opt}</label>
                </li>`;
            });
            html += `</ul>`;
        } 
        else if (q.type === 'MCQ') {
            html += `<ul class="exam-list" style="padding-left: 0;">`;
            q.options.forEach((opt, optIndex) => {
                html += `
                <li style="justify-content: flex-start; gap: 1rem; cursor: pointer;">
                    <input type="checkbox" name="${q.id}" value="${optIndex}" id="opt-${q.id}-${optIndex}"> 
                    <label for="opt-${q.id}-${optIndex}" id="math-opt-${index}-${optIndex}" style="cursor: pointer; width: 100%;">${opt}</label>
                </li>`;
            });
            html += `</ul>`;
        }
        else if (q.type === 'NAT') {
            html += `
            <div style="margin-top: 1rem;">
                <input type="number" step="any" name="${q.id}" id="nat-${q.id}" placeholder="Enter your numerical answer" style="width: 100%; max-width: 300px; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 6px;">
            </div>`;
        }
        
        wrapper.innerHTML = html;
        container.appendChild(wrapper);

        // --- Render KaTeX Synchronously ---
        const renderConfig = {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false}
            ],
            throwOnError: false
        };

        renderMathInElement(document.getElementById(`math-q-${index}`), renderConfig);
        
        if (q.options) {
            q.options.forEach((_, optIndex) => {
                renderMathInElement(document.getElementById(`math-opt-${index}-${optIndex}`), renderConfig);
            });
        }
    });

    // Reveal Submit Button
    document.getElementById("submit-exam-btn").style.display = "block";
}

async function submitExam() {
    const btn = document.getElementById("submit-exam-btn");
    btn.innerText = "Submitting...";
    btn.disabled = true;

    // 1. Gather all inputs
    const answers = {};
    const inputs = document.querySelectorAll('input');

    inputs.forEach(input => {
        const qId = input.name;
        
        if (input.type === 'radio' && input.checked) {
            answers[qId] = input.value;
        } 
        else if (input.type === 'checkbox' && input.checked) {
            if (!answers[qId]) answers[qId] = [];
            answers[qId].push(input.value);
        }
        else if (input.type === 'number' && input.value !== "") {
            answers[qId] = input.value;
        }
    });

    // 2. Package Payload for Backend
    const payload = {
        action: 'submitExam',
        email: studentEmail,
        examId: currentExamId,
        answers: answers
    };

    // 3. Send to Google Apps Script
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        
        if (result.success) {
            localStorage.removeItem(`start_time_${currentExamId}`);
            alert(`Exam Submitted Successfully! Score: ${result.score}`);
            window.location.href = 'dashboard.html'; // Send them back to dashboard
        } else {
            alert("Submission failed: " + result.message);
            btn.innerText = "Submit Exam";
            btn.disabled = false;
        }
    } catch (error) {
        alert("Network error. Please try submitting again.");
        btn.innerText = "Submit Exam";
        btn.disabled = false;
    }
}
