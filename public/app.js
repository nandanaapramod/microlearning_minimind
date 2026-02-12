// Auth State Management
const API_URL = '/api/auth';

function toggleAuth(mode) {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    if (mode === 'signup') {
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
    } else {
        signupForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (res.ok) {
            window.location.href = '/dashboard.html';
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (err) {
        console.error(err);
        alert('An error occurred');
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    try {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await res.json();
        if (res.ok) {
            alert('Registration successful! Please sign in.');
            toggleAuth('login');
        } else {
            alert(data.error || 'Registration failed');
        }
    } catch (err) {
        console.error(err);
        alert('An error occurred');
    }
}

// Check auth on page load (for protected pages)
async function checkAuth() {
    try {
        const res = await fetch(`${API_URL}/me`);
        if (!res.ok) {
            // If on dashboard, redirect to login
            if (window.location.pathname.includes('dashboard')) {
                window.location.href = '/login.html';
            }
        } else {
            const user = await res.json();
            // Update UI with user info if element exists
            const userDisplay = document.getElementById('user-display');
            if (userDisplay) userDisplay.textContent = user.username;
        }
    } catch (err) {
        console.error(err);
    }
}

// Run checkAuth if not on login/landing
if (window.location.pathname !== '/login.html' && window.location.pathname !== '/') {
    checkAuth();
}
