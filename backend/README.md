# SmartDeadline AI - Flask Authentication Backend

This is the production-ready Flask authentication backend for **SmartDeadline AI**. It implements robust secure login, register, and profile authentication services using Flask, SQLAlchemy (SQLite database), Flask-Bcrypt, Flask-CORS, and signed JWT tokens.

---

## 📁 Directory Structure

The backend adheres to a highly modular and structured standard Flask application layout:

```text
backend/
├── app/
│   ├── __init__.py      # App factory, CORS initialization, JWT configurations
│   ├── config.py        # Environmental variables and base config classes
│   ├── models.py        # SQLAlchemy schema defining the User model 
│   └── routes.py        # Blueprint definition & registration, authentication endpoints
├── app.db               # Auto-generated local SQLite database (created on first run)
├── requirements.txt     # Locked production package dependencies
├── run.py               # Main gateway script to execute the Flask application
└── README.md            # Backend developer documentation (this file)
```

---

## 🛠️ Installation & Setup

Ensure you have **Python 3.9+** installed. Follow these steps to set up and run the service locally:

### 1. Initialize Virtual Environment
Navigate to the `backend/` directory and create an isolated python environment:
```bash
cd backend
python3 -m venv venv
```

### 2. Activate Virtual Environment
* On **macOS/Linux**:
  ```bash
  source venv/bin/activate
  ```
* On **Windows**:
  ```cmd
  venv\Scripts\activate
  ```

### 3. Install Required Dependencies
Install the pinned libraries from the requirement list:
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Run the API Server
Start the Flask application:
```bash
python run.py
```
*The server will boot by default on **`http://127.0.0.1:5000`** and automatically auto-create `app.db` with the schema initialized.*

---

## 🛡️ Database Model Details

The `User` model matches the requested data specifications using standard SQLAlchemy attributes:

| Field | Type | Description | Constraints |
| :--- | :--- | :--- | :--- |
| **`id`** | Integer | Unique identifier for each record | Primary Key |
| **`name`** | String(100) | Full name of the student | Not Null |
| **`email`** | String(120) | Institutional academic email address | Unique, Not Null, Indexed |
| **`password_hash`** | String(255) | Securely hashed password credential | Not Null |
| **`university`** | String(150) | Institutional academy name | Nullable |
| **`major`** | String(150) | Declared course of study / academic focus | Nullable |
| **`grad_year`** | Integer | Anticipated year of academic completion | Nullable |
| **`avatar`** | String(50) | Avatar unicode/emoji value | Nullable, Default: `"🎓"` |

---

## 🔌 API Specification

### 1. User Registration
Creates a new account, hashes credentials using Bcrypt, and immediately issues a signed JWT token.

* **Endpoint:** `POST /api/auth/register`
* **Content-Type:** `application/json`
* **Request JSON Payload:**
  ```json
  {
    "name": "Alex Mercer",
    "email": "alex.mercer@stanford.edu",
    "password": "securepassword123",
    "university": "Stanford University",
    "major": "Computer Science",
    "grad_year": 2028,
    "avatar": "💻"
  }
  ```
* **Success Response (`201 Created`):**
  ```json
  {
    "message": "User registered successfully",
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "Alex Mercer",
      "email": "alex.mercer@stanford.edu",
      "university": "Stanford University",
      "major": "Computer Science",
      "grad_year": 2028,
      "avatar": "💻"
    }
  }
  ```
* **Error Responses:**
  * `400 Bad Request` (Missing fields or invalid email formatting):
    ```json
    { "error": "Invalid email format" }
    ```
  * `409 Conflict` (Email address already registered):
    ```json
    { "error": "An account with this email already exists" }
    ```

---

### 2. User Login
Validates passwords against bcrypt hashes, authenticating the user and returning a new JWT session.

* **Endpoint:** `POST /api/auth/login`
* **Content-Type:** `application/json`
* **Request JSON Payload:**
  ```json
  {
    "email": "alex.mercer@stanford.edu",
    "password": "securepassword123"
  }
  ```
* **Success Response (`200 OK`):**
  ```json
  {
    "message": "Logged in successfully",
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "Alex Mercer",
      "email": "alex.mercer@stanford.edu",
      "university": "Stanford University",
      "major": "Computer Science",
      "grad_year": 2028,
      "avatar": "💻"
    }
  }
  ```
* **Error Response (`401 Unauthorized`):**
  ```json
  { "error": "Incorrect email or password" }
  ```

---

### 3. Retrieve Authenticated User Profile
Retrieves the profile of the current active session. Protected by JWT.

* **Endpoint:** `GET /api/auth/me`
* **Required Headers:** `Authorization: Bearer <access_token>`
* **Success Response (`200 OK`):**
  ```json
  {
    "user": {
      "id": 1,
      "name": "Alex Mercer",
      "email": "alex.mercer@stanford.edu",
      "university": "Stanford University",
      "major": "Computer Science",
      "grad_year": 2028,
      "avatar": "💻"
    }
  }
  ```
* **Error Responses:**
  * `401 Unauthorized` (Token missing or token expired):
    ```json
    {
      "error": "Token has expired",
      "details": "The provided JWT access token has expired. Please log in again."
    }
    ```
  * `422 Unprocessable Entity` (Token is malformed or corrupted):
    ```json
    {
      "error": "Invalid Token",
      "details": "The signature or structure of the provided token is invalid."
    }
    ```
