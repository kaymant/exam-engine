// js/review.js

// PASTE YOUR ACTUAL APP SCRIPT URL HERE
const API_URL = 'https://script.google.com/macros/s/AKfycbypWMCNgDxW0y4VJ8n86oDxN7NM0WewaK02lUXAG9TCk8xGT__dmDE0P4j0fsyfk8WGoQ/exec';

let currentExamId = "";
let studentEmail = "";

document.addEventListener("DOMContentLoaded", () => {
    studentEmail = sessionStorage.getItem('studentEmail');
    if (!studentEmail) { window.location.href = 'index.html'; return; }

    const urlParams = new URLSearchParams(window.location.search);
    currentExamId = urlParams.get('id');

    if (!currentExamId) {
        document.getElementById("review-container").innerHTML = "<h3>Error: No exam specified.</h3>";
        return;
    }

    document.getElementById("exam-title").innerText = `Review: ${currentExamId.toUpperCase()}`;
    loadReviewData();
});

async function loadReviewData() {
    try {
        // 1. Fetch Question JSON
        const qResponse = await fetch(`data/${currentExamId}.json`);
        if (!qResponse.ok) throw new Error("Exam file not found.");
        const examData = await qResponse.json();

        // 2. Fetch Review Data from Backend
        const bResponse = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getExamReview', email: studentEmail, examId: currentExamId })
        });
        const reviewData = await bResponse.json();

        if (!reviewData.success) {
            document.getElementById("review-container").innerHTML = `<h3>Locked</h3><p>${reviewData.message}</p>`;
            return;
        }

        document.getElementById("score-display").innerText = `Your Score: ${reviewData.score}`;
        renderReview(examData.questions, reviewData.studentAnswers, reviewData.answerKeys);

    } catch (error) {
        document.getElementById("review-container").innerHTML = `<h3>Error loading review.</h3><p>${error.message}</p>`;
    }
}

function renderReview(questions, studentAnswers, keys) {
    const container = document.getElementById('review-container');
    container.innerHTML = ""; 
    
    questions.forEach((q, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'panel'; 
        wrapper.style.marginBottom = "2rem";
        
        let html = `<h4>Question ${index + 1} <span class="badge ${q.type.toLowerCase()}">${q.type}</span></h4>`;
        html += `<div id="math-q-${index}" style="margin: 1rem 0; font-size: 1.1rem;">${q.text}</div>`;
        
        const keyData = keys[q.id];
        const uAns = studentAnswers[q.id];
        
        // --- SCQ & MCQ ---
        if (q.type === 'SCQ' || q.type === 'MCQ') {
            const correctArr = keyData.ans.toString().split(',');
            const userArr = uAns ? (Array.isArray(uAns) ? uAns : uAns.toString().split(',')) : [];

            html += `<ul class="exam-list" style="padding-left: 0;">`;
            q.options.forEach((opt, optIndex) => {
                const optStr = optIndex.toString();
                const isCorrectAns = correctArr.includes(optStr);
                const isUserAns = userArr.includes(optStr);
                
                let liClass = "";
                if (isCorrectAns && isUserAns) liClass = "correct-bg"; // Got it right
                else if (!isCorrectAns && isUserAns) liClass = "wrong-bg"; // Picked wrong option
                else if (isCorrectAns && !isUserAns) liClass = "missed-bg"; // Should have picked this

                const inputType = q.type === 'SCQ' ? 'radio' : 'checkbox';
                const checkedStr = isUserAns ? "checked" : "";

                html += `
                <li class="${liClass}" style="justify-content: flex-start; gap: 1rem;">
                    <input type="${inputType}" disabled ${checkedStr}> 
                    <label id="math-opt-${index}-${optIndex}" style="width: 100%;">${opt}</label>
                </li>`;
            });
            html += `</ul>`;
        }
        // --- NAT ---
        else if (q.type === 'NAT') {
            const uVal = uAns || "";
            let inputClass = "";
            let fbText = `<strong>Correct Answer:</strong> ${keyData.ans}`;
            
            // Re-run basic grading logic just for visual styling
            let isCorrect = false;
            if(uVal !== "") {
                const uFloat = parseFloat(uVal);
                if (keyData.ans.includes('|')) {
                    const bounds = keyData.ans.split('|');
                    isCorrect = (uFloat >= parseFloat(bounds[0]) && uFloat <= parseFloat(bounds[1]));
                } else {
                    isCorrect = (uFloat === parseFloat(keyData.ans));
                }
                inputClass = isCorrect ? "correct-bg" : "wrong-bg";
            }

            html += `
            <div style="margin-top: 1rem;">
                <input type="text" class="${inputClass}" value="${uVal}" disabled style="width: 100%; max-width: 300px; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 6px;">
            </div>`;
        }

        // Add Feedback Box
        html += `
        <div class="review-feedback">
            <strong>Points:</strong> +${keyData.pos} / -${keyData.neg} <br>
            ${q.type === 'NAT' ? `<strong>Accepted Range/Value:</strong> ${keyData.ans}` : ''}
        </div>`;
        
        wrapper.innerHTML = html;
        container.appendChild(wrapper);

        // Render KaTeX
        const renderConfig = { delimiters: [{left: '$$', right: '$$', display: true}, {left: '$', right: '$', display: false}], throwOnError: false };
        renderMathInElement(document.getElementById(`math-q-${index}`), renderConfig);
        if (q.options) {
            q.options.forEach((_, optIndex) => {
                renderMathInElement(document.getElementById(`math-opt-${index}-${optIndex}`), renderConfig);
            });
        }
    });
}
