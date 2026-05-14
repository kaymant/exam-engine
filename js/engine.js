// js/engine.js

// PASTE YOUR ACTUAL APP SCRIPT URL HERE
const API_URL = 'https://script.google.com/macros/s/AKfycbypWMCNgDxW0y4VJ8n86oDxN7NM0WewaK02lUXAG9TCk8xGT__dmDE0P4j0fsyfk8WGoQ/exec';

let currentExamId = "";
let studentEmail = "";

// Timer Variables
let timerInterval;
let timeRemaining; 
let examDuration; 

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

    document.getElementById("exam-title").innerText = `Exam: ${currentExamId.toUpperCase()}`;
    
    loadExamData();
});

async function loadExamData() {
    try {
        const response = await fetch(`data/${currentExamId}.json`);
        if (!response.ok) throw new Error("Exam file not found");
        
        // 1. Parse the JSON structure
        const examData = await response.json();
        
        // 2. Set the duration (Convert minutes into seconds)
        examDuration = (examData.duration || 60) * 60; 

        // 3. CHECK PERSISTENT TIMER
        const startTimeKey = `start_time_${currentExamId}`;
        const savedStartTime = localStorage.getItem(startTimeKey);

        if (savedStartTime) {
            const elapsed = Math.floor((Date.now() - parseInt(savedStartTime)) / 1000);
            timeRemaining = examDuration - elapsed;
            
            // If expired, clear the old memory and force submit
            if (timeRemaining <= 0) {
                localStorage.removeItem(startTimeKey); // Wipes the "ghost" memory
                showToast("Your time expired while you were away. Submitting what we have.", "error");
                //alert("Your time expired while you were away. Submitting what we have.");
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
    container.innerHTML = ""; 
    
    questions.forEach((q, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'panel'; 
        wrapper.style.marginBottom = "2rem";
        
        let html = `<h4>Question ${index + 1} <span class="badge ${q.type.toLowerCase()}">${q.type}</span></h4>`;
        html += `<div id="math-q-${index}" style="margin: 1rem 0; font-size: 1.1rem;">${q.text}</div>`;
        
        // Input Generation
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

        // Render KaTeX
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

    document.getElementById("submit-exam-btn").style.display = "block";
    
    // START THE CLOCK
    startTimer(); 
}

// --- NEW TIMER FUNCTIONS ---

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);

    updateTimerDisplay(); 

    timerInterval = setInterval(() => {
        timeRemaining--;

        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            timeRemaining = 0;
            updateTimerDisplay();
            showToast("Time is up! Your exam will be submitted automatically.", "error");
            //alert("Time is up! Your exam will be submitted automatically.");
            submitExam(); 
        } else {
            updateTimerDisplay();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const timerElement = document.getElementById('timer');
    if (!timerElement) return;

    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;

    const formattedTime = 
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    timerElement.innerText = formattedTime;

    if (timeRemaining < 300) { // Turns red under 5 minutes
        timerElement.style.color = "var(--error-color)";
    }
}

// --- SUBMISSION LOGIC ---

async function submitExam() {
    // Stop the clock
    if (timerInterval) clearInterval(timerInterval);

    const btn = document.getElementById("submit-exam-btn");
    if(btn) {
        btn.innerText = "Submitting...";
        btn.disabled = true;
    }

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

    const payload = {
        action: 'submitExam',
        email: studentEmail,
        examId: currentExamId,
        answers: answers
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        
        if (result.success) {
            localStorage.removeItem(`start_time_${currentExamId}`);
            showToast(`Exam Submitted! Score: ${result.score}`, "success");
            //alert(`Exam Submitted Successfully! Score: ${result.score}`);
            window.location.href = 'dashboard.html'; 
        } else {
            showToast("Submission failed: " + result.message, "error");
            //alert("Submission failed: " + result.message);
            if(btn) { btn.innerText = "Submit Exam"; btn.disabled = false; }
        }
    } catch (error) {
        showToast("Network error. Please try submitting again.", "error")
        //alert("Network error. Please try submitting again.");
        if(btn) { btn.innerText = "Submit Exam"; btn.disabled = false; }
    }
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
