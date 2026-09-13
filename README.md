# MiniMind — AI-Powered Microlearning Platform

MiniMind is a modern, intelligent microlearning platform designed to enhance academic study workflows for students. It combines AI-driven document validation, interactive quiz generation, academic note management, and a Previous Year Question (PYQ) repository into a cohesive, sleek web application.

---

## ✨ Features

- 🧠 **AI-Powered Document Validation**: Uploaded PDF notes are analyzed using the Google Gemini API to verify academic relevance before processing.
- 📝 **Interactive Note Viewer & Study System**: Clean, distraction-free interface for reading, managing, and studying uploaded notes.
- ⚡ **Automated Quiz Generation**: Create interactive quizzes from academic materials to test and reinforce knowledge.
- 📚 **Previous Year Questions (PYQ) Repository**: Access curated university PYQ papers powered by automated web scraping (`cheerio`, `axios`).
- 📈 **User Dashboard & Progress Tracking**: Track learning progress, note statistics, and quiz scores in real time.
- 🔐 **Secure Authentication**: User sign-up and login secured with `bcryptjs` password hashing and persistent MongoDB sessions (`connect-mongo`).
- 🎨 **Modern Red-and-Black UI**: Custom-styled responsive user interface with dynamic visual feedback and dark-mode aesthetics.

---

## 🛠️ Tech Stack

### **Frontend**
- HTML5, Vanilla CSS3 (Custom Red & Black Palette)
- Modern JavaScript (ES6+ async/await, DOM manipulation)

### **Backend**
- **Runtime**: Node.js
- **Framework**: Express.js 5
- **Authentication & Sessions**: `express-session`, `connect-mongo`, `bcryptjs`
- **File Processing**: `multer`, `pdf-parse`
- **Web Scraping**: `cheerio`, `axios`, `axios-cookiejar-support`

### **AI & Database**
- **AI Model**: Google Gemini API (`@google/generative-ai`)
- **Database**: MongoDB with Mongoose ODM

---

## 📁 Project Structure

```text
microlearn_site/
├── public/                 # Client-side static assets & pages
│   ├── index.html          # Landing page
│   ├── login.html          # User login view
│   ├── signup.html         # User sign-up view
│   ├── dashboard.html      # User dashboard & progress overview
│   ├── note.html           # Note upload & management view
│   ├── quiz.html           # Interactive quiz player
│   ├── viewer.html         # Document & PDF viewer
│   ├── style.css           # Global stylesheet (Red/Black theme)
│   └── app.js             # Client-side API integration & DOM logic
├── src/                    # Server-side application source code
│   ├── models/             # Mongoose schemas
│   │   ├── User.js         # User account schema
│   │   ├── Note.js         # Note metadata schema
│   │   ├── Quiz.js         # Quiz schema
│   │   ├── Progress.js     # User learning progress tracking
│   │   └── PyqPaper.js     # PYQ paper repository schema
│   ├── routes/
│   │   └── api.js          # REST API endpoints (Notes, Quizzes, PYQ, Progress)
│   ├── utils/
│   │   └── scraper.js      # PYQ web scraper utility
│   ├── auth.js             # Authentication logic & session middleware
│   └── server.js           # Express app setup & database connection
├── .env                    # Environment variables configuration
├── package.json            # Node.js dependencies & scripts
└── README.md               # Project documentation
```

---

## 🚀 Getting Started

### **Prerequisites**
Make sure you have the following installed on your system:
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [MongoDB](https://www.mongodb.com/) (running locally or a remote MongoDB Atlas URI)
- Google Gemini API Key

---

### **Installation & Setup**

1. **Clone or navigate to the project directory**:
   ```bash
   cd microlearn_site
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory (or update existing `.env`):
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/microlearn
   SESSION_SECRET=your_super_secret_session_key
   GEMINI_API_KEY=your_google_gemini_api_key
   ```

4. **Start the Application**:

   - **Development mode** (with auto-reload via `nodemon`):
     ```bash
     npm run dev
     ```

   - **Production mode**:
     ```bash
     npm start
     ```

5. **Access the Web Application**:
   Open your browser and navigate to `http://localhost:3000`.

---

## 📡 API Overview

| Method | Endpoint | Description | Authentication Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user account | No |
| `POST` | `/api/auth/login` | Authenticate user and initialize session | No |
| `POST` | `/api/auth/logout` | Terminate active user session | Yes |
| `GET` | `/api/dashboard` | Fetch dashboard user stats | Yes |
| `GET` | `/api/notes` | Get user uploaded academic notes | Yes |
| `POST` | `/api/notes/upload` | Upload PDF note (validated by Gemini AI) | Yes |
| `DELETE` | `/api/notes/:id` | Delete user note | Yes |
| `GET` | `/api/quizzes` | Fetch available quizzes | Yes |
| `GET` | `/api/pyq` | Fetch Previous Year Question papers | Yes |

---

## 📜 License

This project is licensed under the **ISC License**.
