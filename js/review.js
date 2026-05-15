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
        
        let marksObtained = 0; // NEW: Track points for this specific question
        let isAttempted = (uAns !== undefined && uAns !== null && uAns !== "");

        // --- SCQ & MCQ ---
        if (q.type === 'SCQ' || q.type === 'MCQ') {
            const correctArr = keyData.ans.toString().split(',');
            const userArr = uAns ? (Array.isArray(uAns) ? uAns : uAns.toString().split(',')) : [];

            // Calculate Marks
            if (isAttempted) {
                if (q.type === 'SCQ') {
                    marksObtained = (userArr[0] === correctArr[0]) ? keyData.pos : -keyData.neg;
                } else if (q.type === 'MCQ') {
                    let correctCount = 0; let incorrectCount = 0;
                    userArr.forEach(val => {
                        if (correctArr.includes(val.trim())) correctCount++;
                        else incorrectCount++;
                    });
                    if (incorrectCount > 0) marksObtained = -keyData.neg;
                    else if (correctCount === correctArr.length) marksObtained = keyData.pos;
                    else if (correctCount > 0) marksObtained = (correctCount * 1); // Partial marking
                }
            }

            html += `<ul class="exam-list" style="padding-left: 0;">`;
            q.options.forEach((opt, optIndex) => {
                const optStr = optIndex.toString();
                const isCorrectAns = correctArr.includes(optStr);
                const isUserAns = userArr.includes(optStr);
                
                let liClass = "";
                if (isCorrectAns && isUserAns) liClass = "correct-bg"; 
                else if (!isCorrectAns && isUserAns) liClass = "wrong-bg"; 
                else if (isCorrectAns && !isUserAns) liClass = "missed-bg"; 

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
            let isCorrect = false;
            
            if(isAttempted) {
                const uFloat = parseFloat(uVal);
                if (keyData.ans.includes('|')) {
                    const bounds = keyData.ans.split('|');
                    isCorrect = (uFloat >= parseFloat(bounds[0]) && uFloat <= parseFloat(bounds[1]));
                } else {
                    isCorrect = (uFloat === parseFloat(keyData.ans));
                }
                inputClass = isCorrect ? "correct-bg" : "wrong-bg";
                marksObtained = isCorrect ? keyData.pos : -keyData.neg;
            }

            html += `
            <div style="margin-top: 1rem;">
                <input type="text" class="${inputClass}" value="${uVal}" disabled style="width: 100%; max-width: 300px; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 6px;">
            </div>`;
        }

        // Add Enhanced Feedback Box
        let scoreColor = marksObtained > 0 ? 'var(--success-color)' : (marksObtained < 0 ? 'var(--error-color)' : 'var(--text-main)');
        
        html += `
        <div class="review-feedback" style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <strong>Maximum Marks:</strong> +${keyData.pos} / -${keyData.neg} <br>
                ${q.type === 'NAT' ? `<strong>Accepted Answer:</strong> ${keyData.ans}` : ''}
            </div>
            <div style="text-align: right; background: #fff; padding: 0.5rem 1rem; border-radius: 6px; border: 1px solid var(--border-color);">
                <span style="font-size: 0.85rem; color: var(--text-muted); display: block;">Marks Obtained</span>
                <strong style="font-size: 1.25rem; color: ${scoreColor};">${isAttempted ? marksObtained : '0'}</strong>
            </div>
        </div>`;
        
        wrapper.innerHTML = html;
        container.appendChild(wrapper);

        const renderConfig = { delimiters: [{left: '$$', right: '$$', display: true}, {left: '$', right: '$', display: false}], throwOnError: false };
        renderMathInElement(document.getElementById(`math-q-${index}`), renderConfig);
        if (q.options) {
            q.options.forEach((_, optIndex) => {
                renderMathInElement(document.getElementById(`math-opt-${index}-${optIndex}`), renderConfig);
            });
        }
    });
}
