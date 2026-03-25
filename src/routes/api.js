const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Note = require('../models/Note');
const Quiz = require('../models/Quiz');
const Progress = require('../models/Progress');
const PyqPaper = require('../models/PyqPaper');
const { isAuthenticated } = require('../auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Gemini (or OpenAI)
// TODO: User needs to set GEMINI_API_KEY in .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'your_api_key');

// --- Developer PYQ Feature Routes (Public/Admin) ---

// Upload PYQ PDF
router.post('/pyq/upload', upload.single('document'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const subject = req.body.subject;
        if (!subject) return res.status(400).json({ error: 'Subject is required' });

        let textCurent = '';
        if (req.file.mimetype === 'application/pdf') {
            const data = await pdf(req.file.buffer);
            textCurent = data.text;
        } else {
            textCurent = req.file.buffer.toString('utf-8');
        }

        if (!textCurent || textCurent.length < 50) {
            return res.status(400).json({ error: 'Could not extract enough text from file' });
        }

        const pyqPaper = new PyqPaper({
            subject: subject.trim(),
            filename: req.file.originalname,
            originalText: textCurent
        });
        await pyqPaper.save();

        res.json({ message: 'PYQ Uploaded Successfully', pyqId: pyqPaper._id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error processing document: ' + err.message });
    }
});

// Get PYQ Papers list
router.get('/pyq/papers', async (req, res) => {
    try {
        const papers = await PyqPaper.find()
            .select('subject filename createdAt')
            .sort({ createdAt: -1 });
        res.json(papers);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// --- Protected Routes ---
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

        // 0. Validate if the document is actually Notes/Study Material
        const validationPrompt = `Analyze the following text. Is this text primarily instructional study material, academic notes, a lecture transcript, or a textbook excerpt? Answer strictly with "YES" or "NO".\n\nText:\n${textCurent.substring(0, 3000)}`;
        const validationResult = await model.generateContent(validationPrompt);
        const isNotesText = (await validationResult.response.text()).trim().toUpperCase();

        if (!isNotesText.includes('YES')) {
            return res.status(400).json({ error: 'The uploaded file does not appear to be study notes or academic material. Please upload valid lecture notes or textbook excerpts.' });
        }

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

// Delete Single Note
router.delete('/notes/:id', async (req, res) => {
    try {
        const note = await Note.findOneAndDelete({ _id: req.params.id, userId: req.session.userId });
        if (!note) return res.status(404).json({ error: 'Note not found or unauthorized' });

        // Optional: Clean up associated quizzes and progress
        const quizzes = await Quiz.find({ noteId: note._id });
        for (let q of quizzes) {
            await Progress.deleteMany({ quizId: q._id });
            await q.deleteOne();
        }

        res.json({ message: 'Note deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error during deletion' });
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
        const progress = await Progress.find({ userId: req.session.userId })
            .populate({
                path: 'quizId',
                populate: {
                    path: 'noteId',
                    select: 'title'
                }
            });
        res.json(progress);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Chatbot
router.post('/chat', async (req, res) => {
    try {
        const { noteId, message, history } = req.body;
        const note = await Note.findById(noteId);

        if (!note) return res.status(404).json({ error: 'Note not found' });

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Construct prompt with context
        const chat = model.startChat({
            history: history || [],
            generationConfig: {
                maxOutputTokens: 500,
            },
        });

        const prompt = `Context: You are a helpful tutor assisting a student with their notes. 
        Here are the notes: ${note.content.substring(0, 20000)}
        
        Student Question: ${message}
        
        Answer based on the notes provided. Be concise and encouraging.`;

        const result = await chat.sendMessage(prompt);
        const response = await result.response;
        const text = response.text();

        res.json({ reply: text });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Chat error: ' + err.message });
    }
});

const { getKTUOnlinePYQs } = require('../utils/scraper');

// Generate PYQ (Previous Year Questions)
router.post('/pyq', async (req, res) => {
    try {
        const { noteId } = req.body;
        const note = await Note.findById(noteId);

        if (!note) return res.status(404).json({ error: 'Note not found' });

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `Based on the following notes, generate 5 potential "Previous University Exam Style" questions. 
        These should be descriptive questions (marks 5-10 range), not MCQs.
        Format the output as a Markdown list.
        
        Notes: ${note.content.substring(0, 20000)}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.json({ pyq: text });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'PYQ generation error: ' + err.message });
    }
});

// External PYQ from ktuonline.com
router.post('/pyq/external', async (req, res) => {
    try {
        const { noteId } = req.body;
        const note = await Note.findById(noteId);

        if (!note) return res.status(404).json({ error: 'Note not found' });

        // Clean title for search
        const cleanTitle = note.title.replace(/\.[^/.]+$/, "").replace(/_/g, " ").replace(/-/g, " ");
        console.log('Searching External PYQ for:', cleanTitle);

        const links = await getKTUOnlinePYQs(cleanTitle);

        if (links.length === 0) {
            return res.json({ message: 'No external PYQs found for this subject.' });
        }

        res.json({
            source: 'ktuonline.com',
            pageTitle: 'KTU Online Search Results',
            pageLink: 'https://www.ktuonline.com/btech-cs-question-papers.html', // Generic link as we don't have a specific page from search
            links: links
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'External Search Error: ' + err.message });
    }
});


// Extract PYQ from stored PYQ Papers
router.post('/pyq/extract', async (req, res) => {
    try {
        const { noteId } = req.body;
        const note = await Note.findById(noteId);
        if (!note) return res.status(404).json({ error: 'Note not found' });

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // 1. Identify Subject and Topic
        const identifyPrompt = `Given the following note title and content, deduce the Subject and the specific Module/Topic. 
Respond in strict JSON format: {"subject": "string", "topic": "string"}. 
Note Title: ${note.title}
Content: ${note.content.substring(0, 5000)}`;

        const identifyResult = await model.generateContent(identifyPrompt);
        let identifyText = await identifyResult.response.text();
        identifyText = identifyText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        let subject = "", topic = "";
        try {
            const parsed = JSON.parse(identifyText);
            subject = parsed.subject;
            topic = parsed.topic;
        } catch (e) {
            console.error("Failed to parse JSON for subject/topic:", identifyText);
            return res.status(500).json({ error: "Failed to identify subject and topic." });
        }

        // 2. Fetch PYQ Papers (simple case insensitive regex on subject)
        // If subject is "Compiler Design", we look for "compiler" or "design" in stored papers?
        // Let's do a loose word match to be safe.
        const searchTerms = subject.split(' ').filter(w => w.length > 3).join('|');
        const pyqPapers = await PyqPaper.find({
            subject: { $regex: new RegExp(searchTerms, "i") }
        });

        if (!pyqPapers || pyqPapers.length === 0) {
            return res.json({ message: `No uploaded PYQ papers found for subject matching "${subject}". Please upload them in the dashboard under the exact subject name.` });
        }

        // 3. Combine Texts
        let pyqTextCombined = '';
        for (let i = 0; i < pyqPapers.length; i++) {
            pyqTextCombined += `\n\n--- Paper ${i + 1} (${pyqPapers[i].filename}) ---\n${pyqPapers[i].originalText}`;
        }
        
        // Truncate to avoid limits (approx 100k chars for safety)
        pyqTextCombined = pyqTextCombined.substring(0, 150000);

        // 4. Extract
        const extractPrompt = `You are an expert tutor. I am providing you with multiple Previous Year Question Papers for the subject "${subject}".
Extract all questions from these papers that are relevant to the topic: "${topic}".
Group them logically with a markdown heading (e.g., "### ${topic} Questions").
Format the output as a clean Markdown list. Keep only the questions.

Previous Year Papers Text:
${pyqTextCombined}`;

        const extractResult = await model.generateContent(extractPrompt);
        const extractResponseText = await extractResult.response.text();

        res.json({ pyq: extractResponseText, subject: subject, topic: topic, sourcePapers: pyqPapers.map(p => p.filename) });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to extract PYQs: ' + err.message });
    }
});

module.exports = router;
