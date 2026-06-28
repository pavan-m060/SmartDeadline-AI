#  SmartDeadline AI

> **An AI-Powered Academic Co-Pilot for Smarter Learning**

SmartDeadline AI is an intelligent academic productivity platform that helps students efficiently manage assignments, generate personalized study plans, analyze academic performance, and stay on top of deadlines using the power of **Google Gemini AI**.

---

##  Features

###  Authentication
- Secure User Registration
- Secure Login using JWT Authentication
- User Profile Management

###  Assignment Management
- Create Assignments
- Edit Assignments
- Delete Assignments
- Track Assignment Status
- Priority Management
- Deadline Tracking

### AI Features

#### AI Study Planner
- Personalized study schedules
- Time allocation based on deadlines
- Smart workload balancing

####  AI Copilot
- Ask academic questions
- Productivity suggestions
- Study guidance
- Assignment assistance

#### AI Voice Assistant
- Voice commands
- Speech recognition
- AI-powered responses
- Hands-free interaction

####  Weekly AI Review
- Productivity analysis
- Weekly summaries
- AI-generated recommendations

#### Analytics Dashboard
- Completion statistics
- Productivity charts
- Study hour tracking
- Performance insights

###  Academic Calendar
- Assignment Calendar
- Deadline Visualization
- Schedule Planning

###  Smart Notifications
- Upcoming deadline alerts
- AI-generated reminders
- Productivity notifications

### Syllabus Scanner
- Upload syllabus documents
- Extract important dates
- Automatically generate assignments

###  Assignment Scanner
- Upload assignment images
- AI extracts assignment details
- Automatic task creation

---

#  System Architecture

```
                +---------------------+
                |     React + Vite    |
                |   Frontend (UI)     |
                +----------+----------+
                           |
                           |
                 REST API Requests
                           |
                           |
                +----------v----------+
                |     Flask Backend   |
                | JWT Authentication  |
                | Assignment Manager  |
                | AI Services         |
                +----------+----------+
                           |
          +----------------+----------------+
          |                                 |
          |                                 |
+---------v---------+              +--------v--------+
| SQLite Database   |              | Google Gemini   |
| Users             |              | AI API          |
| Assignments       |              | Study Planner   |
| Weekly Reviews    |              | AI Copilot      |
| Notifications     |              | Voice Assistant |
+-------------------+              +-----------------+
```

---

#  Tech Stack

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS

## Backend

- Flask
- SQLAlchemy
- Flask JWT Extended
- SQLite

## Artificial Intelligence

- Google Gemini AI
- Google GenAI SDK

## Other Technologies

- REST API
- Speech Recognition API
- Web Speech API
- HTML5
- CSS3

---

#  Project Structure

```
SmartDeadline-AI
│
├── backend
│   ├── app
│   │   ├── ai_routes.py
│   │   ├── gemini_service.py
│   │   ├── models.py
│   │   ├── routes.py
│   │   └── __init__.py
│   │
│   ├── run.py
│   └── requirements.txt
│
├── src
│   ├── components
│   ├── services
│   ├── types
│   ├── App.tsx
│   └── main.tsx
│
├── package.json
├── vite.config.ts
└── README.md
```

---

# ⚙️ Installation

## Clone Repository

```bash
git clone https://github.com/pavan-m060/SmartDeadline-AI.git

cd SmartDeadline-AI
```

---

## Frontend

```bash
npm install

npm run dev
```

---

## Backend

```bash
cd backend

pip install -r requirements.txt

python run.py
```

---

#  Environment Variables

Create a `.env` file.

```
GEMINI_API_KEY=YOUR_API_KEY
JWT_SECRET_KEY=YOUR_SECRET_KEY
```

---

#  Screenshots

## Landing Page

_Add Screenshot_

## Dashboard

_Add Screenshot_

## Assignment Manager

_Add Screenshot_

## AI Planner

_Add Screenshot_

## AI Copilot

_Add Screenshot_

## Voice Assistant

_Add Screenshot_

## Analytics

_Add Screenshot_

## Weekly Review

_Add Screenshot_

---

#  Workflow

```
User
   │
   ▼
Login/Register
   │
   ▼
Dashboard
   │
   ├─────────────► Assignment Manager
   │
   ├─────────────► Calendar
   │
   ├─────────────► AI Planner
   │
   ├─────────────► AI Copilot
   │
   ├─────────────► Voice Assistant
   │
   ├─────────────► Weekly Review
   │
   ├─────────────► Analytics
   │
   ├─────────────► Notifications
   │
   └─────────────► Syllabus Scanner
```

---

#  Future Enhancements

- Mobile Application
- Multi-language Support
- Smart Exam Preparation
- Collaborative Study Groups
- Cloud Database Integration
- AI Performance Prediction
- Smart Habit Tracking
- Google Calendar Integration

---

#  Developer

**Pavan M**

B.Tech Cyber Security Student

Amrita Vishwa Vidyapeetham

GitHub:
https://github.com/pavan-m060

---

#  Acknowledgements

- Google Gemini AI
- Flask
- React
- Vite
- Tailwind CSS
- SQLAlchemy

---

#  License

This project is developed for educational and hackathon purposes.

---

#  Support

If you like this project, please consider giving it a  on GitHub.
