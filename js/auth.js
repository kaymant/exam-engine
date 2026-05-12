// js/auth.js

// Replace this with your actual deployed Google Apps Script Web App URL
const API_URL = 'https://script.google.com/macros/s/AKfycbypWMCNgDxW0y4VJ8n86oDxN7NM0WewaK02lUXAG9TCk8xGT__dmDE0P4j0fsyfk8WGoQ/exec';

let currentEmail = "";

// Auto-redirect to dashboard if a session already exists
document.addEventListener("DOMContentLoaded", () => {
    if (sessionStorage.getItem('studentEmail')) {
        window.location.href = 'dashboard.html';
    }
});

async function requestOTP() {
    const emailInput = document.getElementById('student-email').value.trim();
    const messageEl = document.getElementById('auth-message');
    const btn = document.getElementById('send-otp-btn');

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput)) {
        messageEl.innerText = "Please enter a valid email address.";
        messageEl.style.color = "var(--error-color)";
        return;
    }

    currentEmail = emailInput;
    btn.innerText = "Sending...";
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
        } else {
            messageEl.innerText = result.message || "Failed to send OTP. Please try again.";
            messageEl.style.color = "var(--error-color)";
            btn.innerText = "Send OTP";
            btn.disabled = false;
        }
    } catch (error) {
        messageEl.innerText = "Network error. Please check your connection.";
        messageEl.style.color = "var(--error-color)";
        btn.innerText = "Send OTP";
        btn.disabled = false;
    }
}

async function verifyOTP() {
    const otpInput = document.getElementById('student-otp').value.trim();
    const messageEl = document.getElementById('auth-message');
    const btn = document.getElementById('verify-otp-btn');

    if (!otpInput) {
        messageEl.innerText = "Please enter the OTP.";
        return;
    }

    btn.innerText = "Verifying...";
    btn.disabled = true;
    messageEl.innerText = "";

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'verifyOTP', email: currentEmail, otp: otpInput })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Success! Store the email in the browser session
            sessionStorage.setItem('studentEmail', currentEmail);
            
            // Redirect to the dashboard
            window.location.href = 'dashboard.html';
        } else {
            messageEl.innerText = result.message || "Invalid OTP. Please try again.";
            messageEl.style.color = "var(--error-color)";
            btn.innerText = "Login";
            btn.disabled = false;
        }
    } catch (error) {
        messageEl.innerText = "Network error. Please check your connection.";
        messageEl.style.color = "var(--error-color)";
        btn.innerText = "Login";
        btn.disabled = false;
    }
}
