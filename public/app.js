const API_URL = '/api';

// DOM Elements
const userDisplay = document.getElementById('user-display');
const logoutBtn = document.getElementById('logout-btn');
const notesGrid = document.getElementById('notes-grid');
const uploadBtn = document.getElementById('upload-btn');
const uploadModal = document.getElementById('upload-modal');
const modalOverlay = document.getElementById('modal-overlay');
const cancelUpload = document.getElementById('cancel-upload');
const uploadForm = document.getElementById('upload-form');
const uploadLoading = document.getElementById('upload-loading');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    if (window.location.pathname.includes('dashboard')) {
        loadNotes();
        loadProgressStats();
    }
});

// Auth Check
async function checkAuth() {
    try {
        const res = await fetch(`${API_URL}/auth/me`);
        if (!res.ok) {
            if (window.location.pathname.includes('dashboard')) {
                window.location.href = '/login.html';
            }
        } else {
            const user = await res.json();
            if (userDisplay) userDisplay.textContent = `Hi, ${user.username}`;
        }
    } catch (err) {
        console.error('Auth check failed', err);
    }
}

// Load Progress Stats
async function loadProgressStats() {
    try {
        const res = await fetch(`${API_URL}/progress`);
        const progressData = await res.json();

        // 1. Total Quizzes
        const totalQuizzes = progressData.length;
        document.getElementById('stat-total-quizzes').textContent = totalQuizzes;

        if (totalQuizzes === 0) return;

        // 2. Statistics Calculation
        let totalScore = 0;
        let maxTotal = 0;
        const subjectStats = {}; // { "Note Title": { score: 10, total: 10, count: 1 } }

        progressData.forEach(p => {
            totalScore += p.score;
            maxTotal += p.totalQuestions;

            // Group by Subject (Note Title)
            // Handle case where note might have been deleted but progress remains (defensive)
            const subjectName = p.quizId && p.quizId.noteId ? p.quizId.noteId.title : 'Deleted Note';

            if (!subjectStats[subjectName]) {
                subjectStats[subjectName] = { score: 0, total: 0, count: 0 };
            }
            subjectStats[subjectName].score += p.score;
            subjectStats[subjectName].total += p.totalQuestions;
            subjectStats[subjectName].count += 1;
        });

        // Overall Average
        const overallAvg = maxTotal > 0 ? Math.round((totalScore / maxTotal) * 100) : 0;
        document.getElementById('stat-avg-score').textContent = `${overallAvg}%`;

        // Render Subject List
        const subjectContainer = document.getElementById('subject-progress-container');
        subjectContainer.innerHTML = Object.entries(subjectStats).map(([name, stats]) => {
            const percentage = Math.round((stats.score / stats.total) * 100);
            return `
                <div style="margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                        <span style="font-weight: 500;">${name}</span>
                        <span class="text-muted">${percentage}%</span>
                    </div>
                    <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
                        <div style="width: ${percentage}%; height: 100%; background: linear-gradient(90deg, var(--primary), var(--secondary));"></div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('Failed to load progress', err);
    }
}

// Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await fetch(`${API_URL}/auth/logout`, { method: 'POST' });
        window.location.href = '/login.html';
    });
}

// Upload Modal Logic
if (uploadBtn) {
    uploadBtn.addEventListener('click', () => {
        uploadModal.style.display = 'block';
        modalOverlay.style.display = 'block';
    });

    const closeModal = () => {
        uploadModal.style.display = 'none';
        modalOverlay.style.display = 'none';
        uploadForm.reset();
        uploadLoading.style.display = 'none';
    };

    cancelUpload.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);

    // Handle Upload
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(uploadForm);

        uploadLoading.style.display = 'block';

        try {
            const res = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                body: formData
            });

            const data = await res.json();

            if (res.ok) {
                closeModal();
                loadNotes(); // Refresh grid
            } else {
                alert(data.error || 'Upload failed');
                uploadLoading.style.display = 'none';
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred during upload.');
            uploadLoading.style.display = 'none';
        }
    });
}

// Load and Render Notes
async function loadNotes() {
    if (!notesGrid) return;

    try {
        const res = await fetch(`${API_URL}/notes`);
        let notes = await res.json();

        // Prevent duplicate entries of the same note on the dashboard
        const uniqueNotes = [];
        const seenTitles = new Set();
        for (const note of notes) {
            if (!seenTitles.has(note.title)) {
                seenTitles.add(note.title);
                uniqueNotes.push(note);
            }
        }
        notes = uniqueNotes;

        if (notes.length === 0) {
            notesGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 4rem;">
                    <p class="text-muted" style="font-size: 1.2rem;">You haven't uploaded anything yet.</p>
                    <p class="text-muted">Click "Upload New Material" to get started!</p>
                </div>
            `;
            return;
        }

        notesGrid.innerHTML = notes.map(note => `
            <div class="glass-card feature-card" style="display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="font-size: 2rem; margin-bottom: 1rem;">📄</div>
                        <button onclick="deleteNote('${note._id}')" style="background: none; border: none; cursor: pointer; font-size: 1.2rem; filter: grayscale(100%); transition: filter 0.2s;" onmouseover="this.style.filter='grayscale(0%)'" onmouseout="this.style.filter='grayscale(100%)'" title="Delete Note">🗑️</button>
                    </div>
                    <h3 style="margin-bottom: 0.5rem; font-size: 1.25rem;">${note.title}</h3>
                    <p class="text-muted text-sm">Created: ${new Date(note.createdAt).toLocaleDateString()}</p>
                </div>
                <div style="margin-top: 1.5rem; display: flex; gap: 0.5rem;">
                    <a href="note.html?id=${note._id}" class="btn btn-outline" style="flex: 1; padding: 0.5rem;">Read Notes</a>
                    <a href="quiz.html?id=${note._id}" class="btn btn-primary" style="flex: 1; padding: 0.5rem;">Take Quiz</a>
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error('Failed to load notes', err);
        notesGrid.innerHTML = '<p class="text-muted">Failed to load notes.</p>';
    }
}

// Delete Note
async function deleteNote(noteId) {
    if (!confirm('Are you sure you want to delete this note? Its quizzes and your progress will also be permanently deleted.')) {
        return;
    }

    try {
        const res = await fetch(`${API_URL}/notes/${noteId}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            loadNotes();
            loadProgressStats(); // Refreshes stats because quizzes might be gone
        } else {
            const data = await res.json();
            alert(data.error || 'Failed to delete note');
        }
    } catch (err) {
        console.error('Error deleting note', err);
        alert('An error occurred while deleting the note.');
    }
}
