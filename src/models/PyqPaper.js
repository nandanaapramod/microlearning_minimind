const mongoose = require('mongoose');

const PyqPaperSchema = new mongoose.Schema({
    subject: { type: String, required: true },
    filename: { type: String, required: true },
    originalText: { type: String, required: true }, // The extracted text from the PDF
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PyqPaper', PyqPaperSchema);
