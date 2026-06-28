from flask_sqlalchemy import SQLAlchemy
import json

# Initialize SQLAlchemy instance to be bound with the application factory
db = SQLAlchemy()

class User(db.Model):
    """User model representing registered academic scholars."""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    university = db.Column(db.String(150), nullable=True)
    major = db.Column(db.String(150), nullable=True)
    grad_year = db.Column(db.Integer, nullable=True)
    avatar = db.Column(db.String(50), nullable=True)
    department = db.Column(db.String(150), nullable=True)
    semester = db.Column(db.String(100), nullable=True)
    settings_json = db.Column(db.Text, nullable=True)

    def to_dict(self):
        """Serialize User object to a dictionary."""
        settings = {}
        if getattr(self, 'settings_json', None):
            try:
                settings = json.loads(self.settings_json)
            except Exception:
                settings = {}
        return {
            'id': self.id,
            'fullName': self.name,
            'email': self.email,
            'university': self.university,
            'major': self.major,
            'graduationYear': str(self.grad_year) if self.grad_year else '',
            'avatar': self.avatar or '🎓',
            'department': self.department or '',
            'semester': self.semester or '',
            'settings': settings
        }

    def __repr__(self):
        return f"<User {self.email}>"


class UserStudyPlan(db.Model):
    """UserStudyPlan model representing dynamic study plans across academic terms."""
    __tablename__ = 'user_study_plans'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)
    plan_json = db.Column(db.Text, nullable=False)
    preferences_json = db.Column(db.Text, nullable=True)  # stores available_hours, session_length, break_interval, etc.
    updated_at = db.Column(db.String(100), nullable=False)

    # Relationship to user
    user = db.relationship('User', backref=db.backref('study_plan', uselist=False, lazy=True, cascade='all, delete-orphan'))

    def to_dict(self):
        """Serialize UserStudyPlan object to a dictionary."""
        plan = {}
        if self.plan_json:
            try:
                plan = json.loads(self.plan_json)
            except Exception:
                plan = {}
        
        prefs = {}
        if self.preferences_json:
            try:
                prefs = json.loads(self.preferences_json)
            except Exception:
                prefs = {}

        return {
            'id': self.id,
            'userId': self.user_id,
            'plan': plan,
            'preferences': prefs,
            'updatedAt': self.updated_at
        }


class Assignment(db.Model):
    """Assignment model for storing academic deliverables."""
    __tablename__ = 'assignments'

    id = db.Column(db.String(100), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    course = db.Column(db.String(255), nullable=False)
    due_date = db.Column(db.String(50), nullable=False)  # Maps to dueDate
    status = db.Column(db.String(50), default='TODO', nullable=False)
    priority = db.Column(db.String(50), default='MEDIUM', nullable=False)
    difficulty = db.Column(db.String(50), default='MEDIUM', nullable=False)
    weight = db.Column(db.Integer, nullable=True)
    estimated_hours = db.Column(db.Float, default=0.0, nullable=False)  # Maps to estimatedHours
    actual_hours_spent = db.Column(db.Float, default=0.0, nullable=False)  # Maps to actualHoursSpent
    description = db.Column(db.Text, nullable=True)
    milestones_json = db.Column(db.Text, nullable=True)  # JSON serialized list of milestones
    attachments_json = db.Column(db.Text, nullable=True)  # JSON serialized list of attachments
    study_plan = db.Column(db.Text, nullable=True)  # AI generated study plan markdown
    created_at = db.Column(db.String(100), nullable=False)  # Maps to createdAt

    # Relationship to user
    user = db.relationship('User', backref=db.backref('assignments', lazy=True, cascade='all, delete-orphan'))

    def to_dict(self):
        """Serialize Assignment object to a dictionary."""
        milestones = []
        if self.milestones_json:
            try:
                milestones = json.loads(self.milestones_json)
            except Exception:
                milestones = []

        attachments = []
        if getattr(self, 'attachments_json', None):
            try:
                attachments = json.loads(self.attachments_json)
            except Exception:
                attachments = []

        return {
            'id': self.id,
            'title': self.title,
            'course': self.course,
            'dueDate': self.due_date,
            'status': self.status,
            'priority': self.priority,
            'difficulty': self.difficulty,
            'weight': self.weight,
            'estimatedHours': self.estimated_hours,
            'actualHoursSpent': self.actual_hours_spent,
            'description': self.description or '',
            'milestones': milestones,
            'attachments': attachments,
            'studyPlan': self.study_plan,
            'createdAt': self.created_at
        }


class StudySession(db.Model):
    """StudySession model for tracking timed study blocks."""
    __tablename__ = 'study_sessions'

    id = db.Column(db.String(100), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    assignment_id = db.Column(db.String(100), nullable=False)  # Maps to assignmentId
    duration_minutes = db.Column(db.Integer, nullable=False)  # Maps to durationMinutes
    date = db.Column(db.String(100), nullable=False)  # ISO string
    notes = db.Column(db.Text, nullable=True)

    # Relationship to user
    user = db.relationship('User', backref=db.backref('study_sessions', lazy=True, cascade='all, delete-orphan'))

    def to_dict(self):
        """Serialize StudySession object to a dictionary."""
        return {
            'id': self.id,
            'assignmentId': self.assignment_id,
            'durationMinutes': self.duration_minutes,
            'date': self.date,
            'notes': self.notes or ''
        }


class Notification(db.Model):
    """Notification model representing dynamic alerts and AI motivation messages."""
    __tablename__ = 'notifications'

    id = db.Column(db.String(100), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    type = db.Column(db.String(50), nullable=False) # UPCOMING_DEADLINE, EXAM_REMINDER, LOW_PRODUCTIVITY, STUDY_STREAK, OVERDUE_ASSIGNMENT, AI_MOTIVATIONAL
    title = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    read = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.String(100), nullable=False) # ISO timestamp
    assignment_id = db.Column(db.String(100), nullable=True)

    # Relationship to user
    user = db.relationship('User', backref=db.backref('notifications', lazy=True, cascade='all, delete-orphan'))

    def to_dict(self):
        """Serialize Notification object to a dictionary."""
        return {
            'id': self.id,
            'type': self.type,
            'title': self.title,
            'message': self.message,
            'read': self.read,
            'createdAt': self.created_at,
            'assignmentId': self.assignment_id
        }


class CopilotMessage(db.Model):
    """CopilotMessage model for storing chatbot conversation messages in the database."""
    __tablename__ = 'copilot_messages'

    id = db.Column(db.String(100), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    role = db.Column(db.String(50), nullable=False)  # 'user' or 'assistant' / 'model'
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.String(100), nullable=False) # ISO timestamp
    plan_json = db.Column(db.Text, nullable=True) # Optional generated copilot plan JSON

    # Relationship to user
    user = db.relationship('User', backref=db.backref('copilot_messages', lazy=True, cascade='all, delete-orphan'))

    def to_dict(self):
        plan = None
        if self.plan_json:
            try:
                plan = json.loads(self.plan_json)
            except Exception:
                plan = None
        return {
            'id': self.id,
            'role': self.role,
            'content': self.content,
            'timestamp': self.timestamp,
            'plan': plan
        }


class AIPrediction(db.Model):
    """AIPrediction model for storing AI predictor history and metrics."""
    __tablename__ = 'ai_predictions'

    id = db.Column(db.String(100), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    assignment_id = db.Column(db.String(100), nullable=True)  # reference to assignment, nullable for global
    timestamp = db.Column(db.String(100), nullable=False)      # ISO timestamp
    
    # Required predictions
    risk_level = db.Column(db.String(50), nullable=False)       # LOW, MEDIUM, HIGH, CRITICAL
    risk_score = db.Column(db.Integer, nullable=False)          # 0 to 100
    completion_probability = db.Column(db.Integer, nullable=False) # 0 to 100
    expected_completion = db.Column(db.String(255), nullable=False) # e.g. "On Time", "Delayed by 2 Days"
    study_workload = db.Column(db.String(255), nullable=False)     # "High: 4h/day"
    stress_level = db.Column(db.String(100), nullable=False)       # "High (8/10)"
    productivity_score = db.Column(db.Integer, nullable=False)     # 0 to 100
    confidence_score = db.Column(db.Integer, nullable=False)       # Prediction confidence %
    analysis = db.Column(db.Text, nullable=False)                  # Gemini reasoning
    interventions_json = db.Column(db.Text, nullable=False)        # JSON list of intervention strings

    # Relationships
    user = db.relationship('User', backref=db.backref('ai_predictions', lazy=True, cascade='all, delete-orphan'))

    def to_dict(self):
        interventions = []
        if self.interventions_json:
            try:
                interventions = json.loads(self.interventions_json)
            except Exception:
                interventions = []
        return {
            'id': self.id,
            'userId': self.user_id,
            'assignmentId': self.assignment_id,
            'timestamp': self.timestamp,
            'riskLevel': self.risk_level,
            'riskScore': self.risk_score,
            'completionProbability': self.completion_probability,
            'expectedCompletion': self.expected_completion,
            'studyWorkload': self.study_workload,
            'stressLevel': self.stress_level,
            'productivityScore': self.productivity_score,
            'confidenceScore': self.confidence_score,
            'analysis': self.analysis,
            'interventions': interventions
        }


class WeeklyReview(db.Model):
    """WeeklyReview model for storing generated weekly reviews and productivity reports."""
    __tablename__ = 'weekly_reviews'

    id = db.Column(db.String(100), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    week_start_date = db.Column(db.String(50), nullable=False)
    week_end_date = db.Column(db.String(50), nullable=False)
    completed_work_count = db.Column(db.Integer, default=0, nullable=False)
    pending_work_count = db.Column(db.Integer, default=0, nullable=False)
    missed_deadlines_count = db.Column(db.Integer, default=0, nullable=False)
    study_hours = db.Column(db.Float, default=0.0, nullable=False)
    productivity_score = db.Column(db.Integer, default=0, nullable=False)
    improvement_suggestions_json = db.Column(db.Text, nullable=False)
    motivation_summary = db.Column(db.Text, nullable=False)
    next_week_study_plan_json = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.String(100), nullable=False)

    user = db.relationship('User', backref=db.backref('weekly_reviews', lazy=True, cascade='all, delete-orphan'))

    def to_dict(self):
        suggestions = []
        if self.improvement_suggestions_json:
            try:
                suggestions = json.loads(self.improvement_suggestions_json)
            except Exception:
                pass
        
        plan = []
        if self.next_week_study_plan_json:
            try:
                plan = json.loads(self.next_week_study_plan_json)
            except Exception:
                pass

        return {
            'id': self.id,
            'weekStartDate': self.week_start_date,
            'weekEndDate': self.week_end_date,
            'completedWorkCount': self.completed_work_count,
            'pendingWorkCount': self.pending_work_count,
            'missedDeadlinesCount': self.missed_deadlines_count,
            'studyHours': self.study_hours,
            'productivityScore': self.productivity_score,
            'improvementSuggestions': suggestions,
            'motivationSummary': self.motivation_summary,
            'nextWeekStudyPlan': plan,
            'createdAt': self.created_at
        }





