// js/auth.js

// Replace this with your actual deployed Google Apps Script Web App URL
const API_URL = 'https://script.google.com/macros/s/AKfycbypWMCNgDxW0y4VJ8n86oDxN7NM0WewaK02lUXAG9TCk8xGT__dmDE0P4j0fsyfk8WGoQ/exec';

let currentEmail = "";
let isNewUserFlow = false; // Tracks if we need to collect Name/Course

document.addEventListener("DOMContentLoaded", () => {
    if (sessionStorage.getItem('studentEmail')) {
        window.location.href = 'dashboard.html';
    }
});

async function requestOTP() {
    const emailInput = document.getElementById('student-email').value.trim();
    const messageEl = document.getElementById('auth-message');
    const btn = document.getElementById('send-otp-btn');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput)) {
        showToast("Please enter a valid email address.", "error");
        //messageEl.innerText = "Please enter a valid email address.";
        return;
    }

    currentEmail = emailInput;
    btn.innerText = "Checking...";
    btn.disabled = true;
    messageEl.innerText = "";

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'requestOTP', email: currentEmail })
        });
        
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('email-step').style.display = 'none';
            document.getElementById('otp-step').style.display = 'block';
            
            // If the backend says this email is brand new, reveal the extra fields
            isNewUserFlow = result.isNewUser;
            if (isNewUserFlow) {
                document.getElementById('new-user-fields').style.display = 'block';
            }
        } else {
            messageEl.innerText = result.message || "Failed to send OTP.";
            btn.innerText = "Continue";
            btn.disabled = false;
        }
    } catch (error) {
        showToast("Network error. Please check your connection.", "error");
        //messageEl.innerText = "Network error. Please check your connection.";
        btn.innerText = "Continue";
        btn.disabled = false;
    }
}

async function verifyOTP() {
    const otpInput = document.getElementById('student-otp').value.trim();
    const messageEl = document.getElementById('auth-message');
    const btn = document.getElementById('verify-otp-btn');
    
    let submitName = "";
    let submitCourse = "";

    if (!otpInput) {
        messageEl.innerText = "Please enter the OTP.";
        return;
    }

    // Only validate Name and Course if they are a new user
    if (isNewUserFlow) {
        submitName = document.getElementById('student-name').value.trim();
        submitCourse = document.getElementById('student-course').value;
        
        if (!submitName) { messageEl.innerText = "Please enter your name."; return; }
        if (!submitCourse) { messageEl.innerText = "Please select a course."; return; }
    }

    btn.innerText = "Verifying...";
    btn.disabled = true;
    messageEl.innerText = "";

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ 
                action: 'verifyOTP', 
                email: currentEmail, 
                name: submitName, 
                course: submitCourse, 
                otp: otpInput 
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            sessionStorage.setItem('studentEmail', currentEmail);
            window.location.href = 'dashboard.html';
        } else {
            messageEl.innerText = result.message || "Invalid OTP. Please try again.";
            btn.innerText = "Login";
            btn.disabled = false;
        }
    } catch (error) {
        messageEl.innerText = "Network error. Please check your connection.";
        btn.innerText = "Login";
        btn.disabled = false;
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
