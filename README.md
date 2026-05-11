# 🧠 ResearchMind — Intelligent Multi-Document Research Assistant

A premium AI-powered research tool built with React + Vite + FastAPI + Google Gemini. Upload research papers, ask questions across all documents, trace citations, generate summaries, and export your findings — all authenticated with Google sign-in.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 Google OAuth | Firebase Authentication — one-click sign-in, no passwords |
| 📄 Multi-doc Upload | PDF, TXT, MD, DOCX — AI extracts text via Gemini Vision |
| 🧠 RAG Pipeline | BM25 retrieval + Gemini synthesis for grounded answers |
| 📌 Citation Tracing | Every answer shows source document + page number |
| 📊 Summarization | Concise / Detailed / Bullet-point styles, cross-doc synthesis |
| 📤 Export | Markdown or JSON export with full Q&A and citations |
| 💾 Session Persistence | Survives browser refresh via localStorage |
| 🌙 Dark / Light Theme | Animated toggle, persisted to localStorage |
| 🔔 Toast Notifications | Success, error, info, warning toasts |
| ⌨️ Ctrl+Enter | Keyboard shortcut to send messages |
| 👍 Feedback Loop | Thumbs up/down on every AI answer |

---


## 🌐 Live Demo
Try the app here: **[ResearchMind](https://intelligent-multi-doc-research-assi.vercel.app)**


## 🚀 Setup

### 1. Clone & install

```bash
git clone <repo>
cd intelligent-multi-doc-research-assistant
npm install
```

### 2. Set up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project (or use existing)
3. Add a **Web App** → copy the config values
4. Go to **Authentication → Sign-in method → Google → Enable**
5. Add `http://localhost:5173` to **Authorized domains**

### 3. Configure environment variables

Edit `.env.local` and fill in your values:

```env
VITE_GEMINI_API_KEY="your_gemini_api_key"

VITE_FIREBASE_API_KEY="..."
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project"
VITE_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="..."
VITE_FIREBASE_APP_ID="..."
```

For the backend, edit `backend/.env`:

```env
GEMINI_API_KEY="your_gemini_api_key"
```

### 4. Run the app

**Frontend:**
```bash
npm run dev
# → http://localhost:5173
```

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
# → http://localhost:8000
```

---

## 🏗️ Architecture

```
src/
├── components/
│   ├── ChatContainer.jsx   # RAG chat, citations, feedback
│   ├── DocBrowser.jsx      # Document library + search
│   ├── ExportPanel.jsx     # Markdown / JSON export
│   ├── LoginPage.jsx       # Google OAuth login
│   ├── Sidebar.jsx         # Navigation + user info
│   ├── SummaryPanel.jsx    # AI summarization
│   └── UploadZone.jsx      # File upload + validation
├── context/
│   ├── AuthContext.jsx     # Firebase auth state
│   ├── ThemeContext.jsx    # Dark/light theme
│   └── ToastContext.jsx    # Toast notification system
├── hooks/
│   └── useSessionPersistence.js  # localStorage session sync
├── services/
│   └── gemini.js           # Gemini API calls
└── firebase.js             # Firebase initialization

backend/
├── main.py                 # FastAPI: /research /suggest_questions /feedback
└── requirements.txt
```

---

## 🔐 Authentication Flow

```
Browser → Firebase Google Popup → ID token issued
         → onAuthStateChanged fires → user object available
         → App renders (or LoginPage if not signed in)
```

Sessions are stored **per-browser** in localStorage. No server-side user data is stored.
