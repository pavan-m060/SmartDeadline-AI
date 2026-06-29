import re
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.models import db, User
from flask_bcrypt import Bcrypt

# Create the auth Blueprint
auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
bcrypt = Bcrypt()

# Standard Email regular expression pattern
EMAIL_REGEX = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

def is_valid_email(email):
    """Validate email using regular expressions."""
    if not email:
        return False
    return bool(re.match(EMAIL_REGEX, email))

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be a valid JSON"}), 400

    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    
    # Optional Profile Details
    university = data.get('university')
    major = data.get('major')
    grad_year = data.get('grad_year')
    avatar = data.get('avatar', '🎓')

    # Basic validations
    if not name or not name.strip():
        return jsonify({"error": "Name field is required"}), 400
    if not email or not email.strip():
        return jsonify({"error": "Email field is required"}), 400
    if not password:
        return jsonify({"error": "Password field is required"}), 400

    email = email.strip().lower()
    if not is_valid_email(email):
        return jsonify({"error": "Invalid email format"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long"}), 400

    # Check if user already exists
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with this email already exists"}), 409

    # Handle optional graduation year validation
    grad_year_val = None
    if grad_year is not None:
        try:
            grad_year_val = int(grad_year)
        except (ValueError, TypeError):
            return jsonify({"error": "Graduation year must be a valid integer"}), 400

    # Password Hashing using Bcrypt
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

    # Create new User model instance
    new_user = User(
        name=name.strip(),
        email=email,
        password_hash=hashed_password,
        university=university.strip() if university else None,
        major=major.strip() if major else None,
        grad_year=grad_year_val,
        avatar=avatar
    )

    try:
        db.session.add(new_user)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Database error while registering user", "details": str(e)}), 400

    # Generate JWT authentication access token
    access_token = create_access_token(identity=str(new_user.id))

    return jsonify({
        "message": "User registered successfully",
        "access_token": access_token,
        "user": new_user.to_dict()
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate and log in an existing user."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be a valid JSON"}), 400

    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    email = email.strip().lower()
    user = User.query.filter_by(email=email).first()

    # Validate password hash with bcrypt
    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({"error": "Incorrect email or password"}), 401

    # Generate access token upon successful login
    access_token = create_access_token(identity=str(user.id))

    return jsonify({
        "message": "Logged in successfully",
        "access_token": access_token,
        "user": user.to_dict()
    }), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    """Fetch profile data for the authenticated user."""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({"error": "User profile not found"}), 404

    return jsonify({
        "user": user.to_dict()
    }), 200


@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update profile data for the authenticated user."""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "User profile not found"}), 404

    data = request.get_json() or {}
    user.name = data.get('fullName', user.name)
    user.university = data.get('university', user.university)
    user.major = data.get('major', user.major)
    user.department = data.get('department', user.department)
    user.semester = data.get('semester', user.semester)
    
    grad_year = data.get('graduationYear')
    if grad_year is not None:
        try:
            user.grad_year = int(grad_year)
        except (ValueError, TypeError):
            pass
            
    user.avatar = data.get('avatar', user.avatar)

    # Save settings/preferences as JSON
    if 'settings' in data:
        user.settings_json = json.dumps(data.get('settings'))

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Database error while updating profile"}), 400

    return jsonify({"message": "Profile updated", "user": user.to_dict()}), 200


@auth_bp.route('/profile/password', methods=['PUT'])
@jwt_required()
def change_password():
    """Change user password after verifying old password."""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "User profile not found"}), 404
        
    data = request.get_json() or {}
    old_password = data.get('oldPassword')
    new_password = data.get('newPassword')
    
    if not old_password or not new_password:
        return jsonify({"error": "Old password and new password are required"}), 400
        
    if not bcrypt.check_password_hash(user.password_hash, old_password):
        return jsonify({"error": "Incorrect old password"}), 400
        
    user.password_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Database error while updating password"}), 400
        
    return jsonify({"message": "Password changed successfully"}), 200


@auth_bp.route('/profile', methods=['DELETE'])
@jwt_required()
def delete_account():
    """Delete authenticated user account and all cascading references."""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "User profile not found"}), 404
        
    try:
        db.session.delete(user)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Database error while deleting account"}), 400
        
    return jsonify({"message": "Account successfully deleted"}), 200


# Assignments endpoints

from app.models import Assignment, StudySession
import json

@auth_bp.route('/assignments', methods=['GET'])
@jwt_required()
def get_assignments():
    """Get all assignments and study sessions for the authenticated user."""
    current_user_id = get_jwt_identity()
    assignments = Assignment.query.filter_by(user_id=current_user_id).all()
    sessions = StudySession.query.filter_by(user_id=current_user_id).all()

    return jsonify({
        "assignments": [a.to_dict() for a in assignments],
        "studySessions": [s.to_dict() for s in sessions]
    }), 200


@auth_bp.route('/assignments', methods=['POST'])
@jwt_required()
def create_assignment():
    """Create a new assignment."""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be a valid JSON"}), 400

    required_fields = ['id', 'title', 'course', 'dueDate', 'priority', 'difficulty']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400

    new_assignment = Assignment(
        id=data['id'],
        user_id=current_user_id,
        title=data['title'],
        course=data['course'],
        due_date=data['dueDate'],
        status=data.get('status', 'TODO'),
        priority=data['priority'],
        difficulty=data['difficulty'],
        weight=data.get('weight', 10),
        estimated_hours=float(data.get('estimatedHours', 0)),
        actual_hours_spent=float(data.get('actualHoursSpent', 0)),
        description=data.get('description', ''),
        milestones_json=json.dumps(data.get('milestones', [])),
        attachments_json=json.dumps(data.get('attachments', [])),
        study_plan=data.get('studyPlan', ''),
        created_at=data.get('createdAt', ''),
        reminder_settings_json=json.dumps(data.get('reminderSettings')) if data.get('reminderSettings') else None
    )

    try:
        db.session.add(new_assignment)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Database error while creating assignment", "details": str(e)}), 400

    return jsonify({"message": "Assignment created", "assignment": new_assignment.to_dict()}), 201


@auth_bp.route('/assignments/<string:assignment_id>', methods=['PUT'])
@jwt_required()
def update_assignment(assignment_id):
    """Update an assignment."""
    current_user_id = get_jwt_identity()
    assignment = Assignment.query.filter_by(id=assignment_id, user_id=current_user_id).first()
    if not assignment:
        return jsonify({"error": "Assignment not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be a valid JSON"}), 400

    # Dynamic fields update
    if 'title' in data:
        assignment.title = data['title']
    if 'course' in data:
        assignment.course = data['course']
    if 'dueDate' in data:
        assignment.due_date = data['dueDate']
    if 'status' in data:
        assignment.status = data['status']
    if 'priority' in data:
        assignment.priority = data['priority']
    if 'difficulty' in data:
        assignment.difficulty = data['difficulty']
    if 'weight' in data:
        assignment.weight = data['weight']
    if 'estimatedHours' in data:
        assignment.estimated_hours = float(data['estimatedHours'])
    if 'actualHoursSpent' in data:
        assignment.actual_hours_spent = float(data['actualHoursSpent'])
    if 'description' in data:
        assignment.description = data['description']
    if 'milestones' in data:
        assignment.milestones_json = json.dumps(data['milestones'])
    if 'attachments' in data:
        assignment.attachments_json = json.dumps(data['attachments'])
    if 'studyPlan' in data:
        assignment.study_plan = data['studyPlan']
    if 'reminderSettings' in data:
        assignment.reminder_settings_json = json.dumps(data['reminderSettings']) if data['reminderSettings'] else None

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Database error while updating assignment", "details": str(e)}), 400

    return jsonify({"message": "Assignment updated", "assignment": assignment.to_dict()}), 200


@auth_bp.route('/assignments/<string:assignment_id>', methods=['DELETE'])
@jwt_required()
def delete_assignment(assignment_id):
    """Delete an assignment."""
    current_user_id = get_jwt_identity()
    assignment = Assignment.query.filter_by(id=assignment_id, user_id=current_user_id).first()
    if not assignment:
        return jsonify({"error": "Assignment not found"}), 404

    try:
        db.session.delete(assignment)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Database error while deleting assignment"}), 400

    return jsonify({"message": "Assignment deleted"}), 200


@auth_bp.route('/study-sessions', methods=['POST'])
@jwt_required()
def log_study_session():
    """Create a new study session."""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be a valid JSON"}), 400

    required_fields = ['id', 'assignmentId', 'durationMinutes', 'date']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400

    new_session = StudySession(
        id=data['id'],
        user_id=current_user_id,
        assignment_id=data['assignmentId'],
        duration_minutes=int(data['durationMinutes']),
        date=data['date'],
        notes=data.get('notes', '')
    )

    try:
        db.session.add(new_session)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Database error while logging study session", "details": str(e)}), 400

    return jsonify({"message": "Study session logged", "studySession": new_session.to_dict()}), 201


# --- Smart Notification System ---

import uuid
from datetime import datetime, timedelta
from app.models import Notification, Assignment, StudySession

def auto_generate_notifications(user_id):
    """Checks academic task status and auto-generates dynamic notifications in the database."""
    assignments = Assignment.query.filter_by(user_id=user_id).all()
    sessions = StudySession.query.filter_by(user_id=user_id).all()
    
    current_date_str = "2026-06-27"
    try:
        today_dt = datetime.strptime(current_date_str, "%Y-%m-%d")
    except Exception:
        today_dt = datetime.now()
        
    for a in assignments:
        if a.status == 'COMPLETED':
            continue
        try:
            due_dt = datetime.strptime(a.due_date[:10], "%Y-%m-%d")
            days_left = (due_dt - today_dt).days
        except Exception:
            continue
            
        if days_left < 0:
            # Overdue assignment
            existing = Notification.query.filter_by(
                user_id=user_id,
                type='OVERDUE_ASSIGNMENT',
                assignment_id=a.id
            ).first()
            if not existing:
                notif = Notification(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    type='OVERDUE_ASSIGNMENT',
                    title=f"Assignment Overdue: {a.title}",
                    message=f"'{a.title}' for {a.course} is overdue! It was due on {a.due_date}.",
                    read=False,
                    created_at=datetime.now().isoformat(),
                    assignment_id=a.id
                )
                db.session.add(notif)
        elif days_left == 1:
            # Assignment due tomorrow
            existing = Notification.query.filter_by(
                user_id=user_id,
                type='ASSIGNMENT_DUE_TOMORROW',
                assignment_id=a.id
            ).first()
            if not existing:
                notif = Notification(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    type='ASSIGNMENT_DUE_TOMORROW',
                    title=f"Due Tomorrow: {a.title}",
                    message=f"'{a.title}' for {a.course} is due tomorrow ({a.due_date})! Make sure to put the finishing touches on it.",
                    read=False,
                    created_at=datetime.now().isoformat(),
                    assignment_id=a.id
                )
                db.session.add(notif)
        elif 0 <= days_left <= 3:
            # Upcoming deadline
            existing = Notification.query.filter_by(
                user_id=user_id,
                type='UPCOMING_DEADLINE',
                assignment_id=a.id
            ).first()
            if not existing:
                notif = Notification(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    type='UPCOMING_DEADLINE',
                    title=f"Upcoming Deadline: {a.title}",
                    message=f"'{a.title}' for {a.course} is due in {days_left} days ({a.due_date}). Keep making progress!",
                    read=False,
                    created_at=datetime.now().isoformat(),
                    assignment_id=a.id
                )
                db.session.add(notif)
                
        # Priority changes automatic escalation
        if 0 <= days_left <= 2 and a.priority in ['LOW', 'MEDIUM']:
            existing = Notification.query.filter_by(
                user_id=user_id,
                type='PRIORITY_CHANGES',
                assignment_id=a.id
            ).first()
            if not existing:
                notif = Notification(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    type='PRIORITY_CHANGES',
                    title="AI Priority Escalation",
                    message=f"AI detected that '{a.title}' is due in {days_left} days. We escalated its priority to HIGH so you can focus on it immediately.",
                    read=False,
                    created_at=datetime.now().isoformat(),
                    assignment_id=a.id
                )
                db.session.add(notif)
                # Escalate the actual assignment priority in database
                a.priority = 'HIGH'
                db.session.add(a)

        # Exam reminder
        is_exam = any(term in a.title.lower() or term in (a.description or "").lower() for term in ["exam", "test", "midterm", "final", "quiz"])
        if is_exam and 0 <= days_left <= 7:
            existing = Notification.query.filter_by(
                user_id=user_id,
                type='EXAM_REMINDER',
                assignment_id=a.id
            ).first()
            if not existing:
                notif = Notification(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    type='EXAM_REMINDER',
                    title=f"Exam Reminder: {a.title}",
                    message=f"'{a.title}' for {a.course} is scheduled on {a.due_date}. Focus on study milestones now!",
                    read=False,
                    created_at=datetime.now().isoformat(),
                    assignment_id=a.id
                )
                db.session.add(notif)

    # Missed Study Session check
    for s in sessions:
        try:
            sess_dt = datetime.strptime(s.date[:10], "%Y-%m-%d")
            # If scheduled study block is in the past and notes don't indicate it was a logged focus session
            if sess_dt < today_dt and "logged" not in (s.notes or "").lower():
                existing = Notification.query.filter_by(
                    user_id=user_id,
                    type='MISSED_STUDY_SESSION',
                    assignment_id=s.assignment_id
                ).first()
                if not existing:
                    related_assignment = Assignment.query.get(s.assignment_id)
                    assignment_title = related_assignment.title if related_assignment else "General Study"
                    notif = Notification(
                        id=str(uuid.uuid4()),
                        user_id=user_id,
                        type='MISSED_STUDY_SESSION',
                        title="Missed Study Session",
                        message=f"You missed your scheduled study block for '{assignment_title}' on {s.date[:10]}. Let's reschedule or complete a short focus timer now!",
                        read=False,
                        created_at=datetime.now().isoformat(),
                        assignment_id=s.assignment_id
                    )
                    db.session.add(notif)
        except Exception:
            pass

    # Low Productivity
    # Check sessions logged in past 3 days (after 2026-06-24)
    recent_minutes = 0
    for s in sessions:
        try:
            sess_dt = datetime.strptime(s.date[:10], "%Y-%m-%d")
            days_ago = (today_dt - sess_dt).days
            if 0 <= days_ago <= 3:
                recent_minutes += s.duration_minutes
        except Exception:
            pass
            
    pending_count = sum(1 for a in assignments if a.status != 'COMPLETED')
    if recent_minutes < 45 and pending_count > 0:
        existing = Notification.query.filter_by(
            user_id=user_id,
            type='LOW_PRODUCTIVITY'
        ).order_by(Notification.created_at.desc()).first()
        
        should_create = True
        if existing:
            try:
                created_dt = datetime.fromisoformat(existing.created_at)
                if (datetime.now() - created_dt).days < 2:
                    should_create = False
            except Exception:
                pass
                
        if should_create:
            notif = Notification(
                id=str(uuid.uuid4()),
                user_id=user_id,
                type='LOW_PRODUCTIVITY',
                title="Low Productivity Nudge",
                message=f"You've logged only {recent_minutes} focused minutes over the past 3 days. Dedicate a short block today to keep up with your {pending_count} pending tasks!",
                read=False,
                created_at=datetime.now().isoformat()
            )
            db.session.add(notif)

    # Study Streak
    session_dates = set()
    for s in sessions:
        try:
            session_dates.add(s.date[:10])
        except Exception:
            pass
            
    streak = 0
    temp_date = today_dt
    while True:
        if temp_date.strftime("%Y-%m-%d") in session_dates:
            streak += 1
            temp_date -= timedelta(days=1)
        else:
            break
            
    if streak == 0:
        yesterday = today_dt - timedelta(days=1)
        temp_date = yesterday
        while True:
            if temp_date.strftime("%Y-%m-%d") in session_dates:
                streak += 1
                temp_date -= timedelta(days=1)
            else:
                break
                
    if streak >= 2:
        existing = Notification.query.filter_by(
            user_id=user_id,
            type='STUDY_STREAK'
        ).first()
        
        should_create = True
        if existing:
            if f"{streak}-day" in existing.message:
                should_create = False
            else:
                db.session.delete(existing)
                
        if should_create:
            notif = Notification(
                id=str(uuid.uuid4()),
                user_id=user_id,
                type='STUDY_STREAK',
                title="Phenomenal Streak!",
                message=f"You have maintained an active {streak}-day study streak! Keep up the incredible momentum.",
                read=False,
                created_at=datetime.now().isoformat()
            )
            db.session.add(notif)

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print("Auto-generate notifications failed:", e)


@auth_bp.route('/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    current_user_id = get_jwt_identity()
    auto_generate_notifications(current_user_id)
    notifications = Notification.query.filter_by(user_id=current_user_id).all()
    # Sort by created_at descending
    notifications_sorted = sorted(notifications, key=lambda x: x.created_at, reverse=True)
    return jsonify([n.to_dict() for n in notifications_sorted]), 200


@auth_bp.route('/notifications/<string:notif_id>/read', methods=['PUT'])
@jwt_required()
def mark_notification_read(notif_id):
    current_user_id = get_jwt_identity()
    notif = Notification.query.filter_by(id=notif_id, user_id=current_user_id).first()
    if not notif:
        return jsonify({"error": "Notification not found"}), 404
    notif.read = True
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Database error", "details": str(e)}), 400
    return jsonify({"message": "Notification marked as read", "notification": notif.to_dict()}), 200


@auth_bp.route('/notifications/mark-all-read', methods=['POST'])
@jwt_required()
def mark_all_notifications_read():
    current_user_id = get_jwt_identity()
    unread_notifications = Notification.query.filter_by(user_id=current_user_id, read=False).all()
    for n in unread_notifications:
        n.read = True
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Database error", "details": str(e)}), 400
    return jsonify({"message": "All notifications marked as read"}), 200


@auth_bp.route('/notifications/<string:notif_id>', methods=['DELETE'])
@jwt_required()
def delete_notification(notif_id):
    current_user_id = get_jwt_identity()
    notif = Notification.query.filter_by(id=notif_id, user_id=current_user_id).first()
    if not notif:
        return jsonify({"error": "Notification not found"}), 404
    try:
        db.session.delete(notif)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Database error", "details": str(e)}), 400
    return jsonify({"message": "Notification deleted"}), 200


@auth_bp.route('/notifications/clear-all', methods=['POST'])
@jwt_required()
def clear_all_notifications():
    current_user_id = get_jwt_identity()
    Notification.query.filter_by(user_id=current_user_id).delete()
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Database error", "details": str(e)}), 400
    return jsonify({"message": "All notifications cleared"}), 200

@auth_bp.route('/notifications/smart-reminder', methods=['POST'])
@jwt_required()
def create_smart_reminder_notification():
    current_user_id = get_jwt_identity()
    data = request.get_json()
    if not data or 'title' not in data or 'message' not in data:
        return jsonify({"error": "Missing title or message"}), 400

    notif = Notification(
        id=str(uuid.uuid4()),
        user_id=current_user_id,
        type='SMART_REMINDER',
        title=data['title'],
        message=data['message'],
        read=False,
        created_at=datetime.now().isoformat(),
        assignment_id=data.get('assignment_id')
    )
    db.session.add(notif)
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Database error", "details": str(e)}), 400
    
    return jsonify(notif.to_dict()), 201


@auth_bp.route('/notifications/generate-motivation', methods=['POST'])
@jwt_required()
def trigger_ai_motivation():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    assignments = Assignment.query.filter_by(user_id=current_user_id).all()
    sessions = StudySession.query.filter_by(user_id=current_user_id).all()
    
    active_assignments = [a for a in assignments if a.status != 'COMPLETED']
    overdue_count = 0
    upcoming_count = 0
    current_date_str = "2026-06-27"
    try:
        today_dt = datetime.strptime(current_date_str, "%Y-%m-%d")
    except Exception:
        today_dt = datetime.now()
        
    for a in active_assignments:
        try:
            due_dt = datetime.strptime(a.due_date[:10], "%Y-%m-%d")
            days_left = (due_dt - today_dt).days
            if days_left < 0:
                overdue_count += 1
            elif days_left <= 3:
                upcoming_count += 1
        except Exception:
            pass
            
    work_summary = f"Total Assignments: {len(assignments)}. Active Assignments: {len(active_assignments)} (Overdue: {overdue_count}, Upcoming in 3 days: {upcoming_count})."
    
    recent_minutes = sum(s.duration_minutes for s in sessions)
    sessions_summary = f"Logged study hours: {round(recent_minutes / 60, 1)}h over {len(sessions)} study blocks."
    
    from app.gemini_service import GeminiService
    gemini_svc = GeminiService()
    
    ai_resp = gemini_svc.generate_ai_motivation_notification(
        user_name=user.name,
        assignments_summary=work_summary,
        sessions_summary=sessions_summary
    )
    
    title = ai_resp.get("title", f"Power Up, {user.name}!")
    message = ai_resp.get("message", "You have assignments awaiting your focus. Block out just 20 minutes today to unlock deep focus.")
    
    new_notif = Notification(
        id=str(uuid.uuid4()),
        user_id=current_user_id,
        type='AI_MOTIVATIONAL',
        title=title,
        message=message,
        read=False,
        created_at=datetime.now().isoformat()
    )
    
    try:
        db.session.add(new_notif)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to save AI notification", "details": str(e)}), 400
        
    return jsonify(new_notif.to_dict()), 201


@auth_bp.route('/weekly-reviews', methods=['GET'])
@jwt_required()
def get_weekly_reviews():
    """Get all weekly reviews for the authenticated user."""
    from app.models import WeeklyReview
    current_user_id = get_jwt_identity()
    reviews = WeeklyReview.query.filter_by(user_id=current_user_id).all()
    # Sort descending by creation date
    reviews_sorted = sorted(reviews, key=lambda r: r.created_at, reverse=True)
    return jsonify([r.to_dict() for r in reviews_sorted]), 200


@auth_bp.route('/weekly-reviews', methods=['POST'])
@jwt_required()
def create_weekly_review():
    """Save a new weekly review for the authenticated user."""
    from app.models import WeeklyReview
    import uuid
    from datetime import datetime
    
    current_user_id = get_jwt_identity()
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be a valid JSON"}), 400

    new_review = WeeklyReview(
        id=f"rev-{uuid.uuid4()}",
        user_id=current_user_id,
        week_start_date=data.get('weekStartDate', ''),
        week_end_date=data.get('weekEndDate', ''),
        completed_work_count=data.get('completedWorkCount', 0),
        pending_work_count=data.get('pendingWorkCount', 0),
        missed_deadlines_count=data.get('missedDeadlinesCount', 0),
        study_hours=float(data.get('studyHours', 0.0)),
        productivity_score=data.get('productivityScore', 0),
        improvement_suggestions_json=json.dumps(data.get('improvementSuggestions', [])),
        motivation_summary=data.get('motivationSummary', ''),
        next_week_study_plan_json=json.dumps(data.get('nextWeekStudyPlan', [])),
        created_at=datetime.now().isoformat()
    )

    try:
        db.session.add(new_review)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Database error while saving weekly review", "details": str(e)}), 400

    return jsonify(new_review.to_dict()), 201

