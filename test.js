require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const mongoose = require('mongoose');
const Note = require('./src/models/Note');
const PyqPaper = require('./src/models/PyqPaper');

mongoose.connect('mongodb://localhost:27017/microlearn').then(async () => {
    try {
        const noteId = '69c410394c896d48aae1fceb';
        const note = await Note.findById(noteId);
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        
        const identifyPrompt = `Given the following note title and content, deduce the Subject and the specific Module/Topic. 
Respond in strict JSON format: {"subject": "string", "topic": "string"}. 
Note Title: ${note.title}
Content: ${note.content.substring(0, 5000)}`;
        
        const identifyResult = await model.generateContent(identifyPrompt);
        let identifyText = await identifyResult.response.text();
        identifyText = identifyText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        console.log('Parsed identifyText:', identifyText);

        const parsed = JSON.parse(identifyText);
        const subject = parsed.subject;
        const topic = parsed.topic;

        const searchTerms = subject.split(' ').filter(w => w.length > 3).join('|');
        const pyqPapers = await PyqPaper.find({
            subject: { $regex: new RegExp(searchTerms, "i") }
        });

        console.log(`Found ${pyqPapers.length} papers for subject '${subject}' using regex '${searchTerms}'`);

        if (pyqPapers.length > 0) {
            let pyqTextCombined = '';
            for (let i = 0; i < pyqPapers.length; i++) {
                pyqTextCombined += `\n\n--- Paper ${i + 1} (${pyqPapers[i].filename}) ---\n${pyqPapers[i].originalText}`;
            }
            pyqTextCombined = pyqTextCombined.substring(0, 150000);

            const extractPrompt = `You are an expert tutor. I am providing you with multiple Previous Year Question Papers for the subject "${subject}".
Extract all questions from these papers that are relevant to the topic: "${topic}".
Group them logically with a markdown heading (e.g., "### ${topic} Questions").
Format the output as a clean Markdown list. Keep only the questions.

Previous Year Papers Text:
${pyqTextCombined}`;

            console.log('Extracting questions...');
            const extractResult = await model.generateContent(extractPrompt);
            console.log('Result:\n', extractResult.response.text());
        }

    } catch(err) {
        console.error('Error:', err);
    } finally {
        mongoose.disconnect();
    }
});
