const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Note = require('../models/Note');
const Quiz = require('../models/Quiz');
const Progress = require('../models/Progress');
const { isAuthenticated } = require('../auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Gemini (or OpenAI)
// TODO: User needs to set GEMINI_API_KEY in .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'REMOVED');

router.use(isAuthenticated);

// Upload and Process
router.post('/upload', upload.single('document'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        let textCurent = '';

        // Extract Text
        if (req.file.mimetype === 'application/pdf') {
            const data = await pdf(req.file.buffer);
            textCurent = data.text;
        } else {
            textCurent = req.file.buffer.toString('utf-8');
        }

        if (!textCurent || textCurent.length < 50) {
            return res.status(400).json({ error: 'Could not extract enough text from file' });
        }

        // AI Generation
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // 1. Generate Notes
        const notePrompt = `Summarize the following text into concise, easy-to-study notes using Markdown formatting. Use headers, bullet points, and bold text for key concepts:\n\n${textCurent.substring(0, 30000)}`; // Limit char count
        const noteResult = await model.generateContent(notePrompt);
        const noteResponse = await noteResult.response;
        const noteText = noteResponse.text();

        // 2. Generate Quiz
        const quizPrompt = `Generate a quiz with 5 multiple-choice questions based on the text. Return ONLY a JSON object with the following structure: 
    { "questions": [ { "question": "...", "options": ["...", "...", "...", "..."], "correctAnswer": "exact string match" } ] }
    \n\nText:\n${textCurent.substring(0, 30000)}`;

        const quizResult = await model.generateContent(quizPrompt);
        const quizResponse = await quizResult.response;
        const quizText = quizResponse.text();

        // Clean JSON markdown if present
        const cleanJson = quizText.replace(/```json/g, '').replace(/```/g, '').trim();
        const quizData = JSON.parse(cleanJson);

        // Save to DB
        const note = new Note({
            userId: req.session.userId,
            title: req.file.originalname,
            content: noteText,
            originalText: textCurent // Optional, maybe truncate
        });
        await note.save();

        const quiz = new Quiz({
            userId: req.session.userId,
            noteId: note._id,
            title: `Quiz: ${req.file.originalname}`,
            questions: quizData.questions
        });
        await quiz.save();

        res.json({ message: 'Success', noteId: note._id });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error processing document: ' + err.message });
    }
});

// Get All Notes
router.get('/notes', async (req, res) => {
    try {
        const notes = await Note.find({ userId: req.session.userId }).sort({ createdAt: -1 });
        res.json(notes);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Single Note
router.get('/notes/:id', async (req, res) => {
    try {
        const note = await Note.findOne({ _id: req.params.id, userId: req.session.userId });
        if (!note) return res.status(404).json({ error: 'Note not found' });
        res.json(note);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Quiz for Note
router.get('/notes/:id/quiz', async (req, res) => {
    try {
        const quiz = await Quiz.findOne({ noteId: req.params.id, userId: req.session.userId });
        if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
        res.json(quiz);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Save Progress
router.post('/progress', async (req, res) => {
    try {
        const { quizId, score, totalQuestions } = req.body;
        const progress = new Progress({
            userId: req.session.userId,
            quizId,
            score,
            totalQuestions
        });
        await progress.save();
        res.json({ message: 'Progress saved' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Progress Stats
router.get('/progress', async (req, res) => {
    try {
        const progress = await Progress.find({ userId: req.session.userId });
        res.json(progress);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
