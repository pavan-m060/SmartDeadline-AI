from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.gemini_service import GeminiService
from app.models import Assignment, db, UserStudyPlan, StudySession, CopilotMessage, AIPrediction
import io
import os
import json
import uuid
from datetime import datetime
from pypdf import PdfReader
import docx

# Create the AI Blueprint
ai_bp = Blueprint('ai', __name__, url_prefix='/api/ai')
gemini = GeminiService()

def extract_text_from_file(file_bytes, filename):
    ext = os.path.splitext(filename)[1].lower()
    text = ""
    if ext == '.pdf':
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    text += t + "\n"
        except Exception as e:
            text = f"[Error extracting PDF: {str(e)}]"
    elif ext in ['.docx', '.doc']:
        try:
            doc = docx.Document(io.BytesIO(file_bytes))
            text = "\n".join([p.text for p in doc.paragraphs])
        except Exception as e:
            text = f"[Error extracting DOCX: {str(e)}]"
    elif ext in ['.txt', '.md']:
        try:
            text = file_bytes.decode('utf-8', errors='ignore')
        except Exception as e:
            text = f"[Error reading text file: {str(e)}]"
    else:
        try:
            text = file_bytes.decode('utf-8', errors='ignore')
        except Exception:
            text = "[Unsupported file format]"
    return text

@ai_bp.route('/parse-syllabus', methods=['POST'])
@jwt_required()
def parse_syllabus_endpoint():
    """Extracts text from a syllabus file or parses manual text with Gemini to automatically create academic tasks."""
    current_user_id = get_jwt_identity()
    
    # Get action and manual rawText if applicable
    action = request.form.get('action', 'parse_and_create')
    raw_text = request.form.get('rawText', '')
    
    # If the request is JSON format
    if request.is_json:
        json_data = request.get_json()
        action = json_data.get('action', 'parse_and_create')
        raw_text = json_data.get('rawText', '')
    
    # Check for file uploads
    if 'file' in request.files:
        file = request.files['file']
        if file.filename != '':
            file_bytes = file.read()
            raw_text = extract_text_from_file(file_bytes, file.filename)
            if action == 'extract':
                return jsonify({
                    "extractedText": raw_text,
                    "filename": file.filename
                }), 200

    # For manual extraction
    if action == 'extract':
        return jsonify({
            "extractedText": raw_text,
            "filename": "Pasted Text"
        }), 200

    if action == 'save_imported':
        if not request.is_json:
            return jsonify({"error": "Request body must be a valid JSON containing tasks list."}), 400
        json_data = request.get_json()
        tasks = json_data.get('tasks', [])
        
        created_assignments = []
        try:
            for task in tasks:
                task_id = f"assignment-{int(datetime.utcnow().timestamp() * 1000)}-{uuid.uuid4().hex[:6]}"
                
                # Form milestones array
                milestones_list = []
                milestones_source = task.get("milestones", [])
                for idx, m in enumerate(milestones_source):
                    if isinstance(m, dict):
                        m_title = m.get("title", f"Milestone {idx + 1}")
                        m_comp = m.get("completed", False)
                        m_est = m.get("estimatedMinutes")
                        m_due = m.get("dueDate")
                    else:
                        m_title = str(m)
                        m_comp = False
                        m_est = None
                        m_due = None
                        
                    milestones_list.append({
                        "id": f"milestone-{uuid.uuid4().hex[:8]}-{idx}",
                        "title": m_title,
                        "completed": m_comp,
                        "estimatedMinutes": m_est,
                        "dueDate": m_due
                    })
                    
                # Save safely
                weight_val = 10
                try:
                    weight_val = int(task.get("weight", 10))
                except (ValueError, TypeError):
                    pass
                    
                est_hours = 5.0
                try:
                    est_hours = float(task.get("estimatedHours", 5.0))
                except (ValueError, TypeError):
                    pass

                new_assignment = Assignment(
                    id=task_id,
                    user_id=current_user_id,
                    title=task.get("title", "Syllabus Task"),
                    course=task.get("course", "General"),
                    due_date=task.get("dueDate", datetime.utcnow().strftime("%Y-%m-%d")),
                    status="TODO",
                    priority=task.get("priority", "MEDIUM"),
                    difficulty=task.get("difficulty", "MEDIUM"),
                    weight=weight_val,
                    estimated_hours=est_hours,
                    actual_hours_spent=0.0,
                    description=task.get("description", ""),
                    milestones_json=json.dumps(milestones_list),
                    study_plan="",
                    created_at=datetime.utcnow().isoformat() + "Z"
                )
                
                db.session.add(new_assignment)
                created_assignments.append(new_assignment.to_dict())
                
            db.session.commit()
            return jsonify({
                "message": "Syllabus processed and tasks imported successfully.",
                "tasks": created_assignments
            }), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({
                "error": "Failed to save imported syllabus tasks",
                "details": str(e)
            }), 500

    if action == 'parse_only':
        if not raw_text or not raw_text.strip():
            return jsonify({"error": "No syllabus content found. Please upload a file or paste text first."}), 400
        try:
            ai_result = gemini.parse_syllabus_with_gemini(raw_text)
            return jsonify(ai_result), 200
        except Exception as e:
            return jsonify({
                "error": "Failed to parse syllabus with Gemini",
                "details": str(e)
            }), 500

    if not raw_text or not raw_text.strip():
        return jsonify({"error": "No syllabus content found. Please upload a file or paste text first."}), 400

    try:
        # Call Gemini Service
        ai_result = gemini.parse_syllabus_with_gemini(raw_text)
        
        summary = ai_result.get("summary", "No course summary available.")
        tasks = ai_result.get("tasks", [])
        
        created_assignments = []
        for task in tasks:
            task_id = f"assignment-{int(datetime.utcnow().timestamp() * 1000)}-{uuid.uuid4().hex[:6]}"
            
            # Form milestones array
            milestones_list = []
            for idx, m_title in enumerate(task.get("milestones", [])):
                milestones_list.append({
                    "id": f"milestone-{uuid.uuid4().hex[:8]}-{idx}",
                    "title": str(m_title),
                    "completed": False
                })
                
            # Save safely
            weight_val = 10
            try:
                weight_val = int(task.get("weight", 10))
            except (ValueError, TypeError):
                pass
                
            est_hours = 5.0
            try:
                est_hours = float(task.get("estimatedHours", 5.0))
            except (ValueError, TypeError):
                pass

            new_assignment = Assignment(
                id=task_id,
                user_id=current_user_id,
                title=task.get("title", "Syllabus Task"),
                course=task.get("course", "General"),
                due_date=task.get("dueDate", datetime.utcnow().strftime("%Y-%m-%d")),
                status="TODO",
                priority=task.get("priority", "MEDIUM"),
                difficulty=task.get("difficulty", "MEDIUM"),
                weight=weight_val,
                estimated_hours=est_hours,
                actual_hours_spent=0.0,
                description=task.get("description", ""),
                milestones_json=json.dumps(milestones_list),
                study_plan="",
                created_at=datetime.utcnow().isoformat() + "Z"
            )
            
            db.session.add(new_assignment)
            created_assignments.append(new_assignment.to_dict())
            
        db.session.commit()
        
        return jsonify({
            "message": "Syllabus processed successfully. Academic tasks have been generated.",
            "summary": summary,
            "tasks": created_assignments
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "error": "Failed to parse syllabus or save tasks",
            "details": str(e)
        }), 500

@ai_bp.route('/study-plan', methods=['POST'])
@jwt_required()
def study_plan():
    """Generates an automated study plan for an assignment."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be a valid JSON"}), 400

    # Frontend may send 'assignment' key directly or the assignment attributes at the root
    assignment_data = data.get('assignment', data)
    
    if not assignment_data:
        return jsonify({"error": "No assignment data provided in request"}), 400

    plan_result = gemini.generate_study_plan(assignment_data)
    return jsonify(plan_result), 200


@ai_bp.route('/comprehensive-study-plan', methods=['GET', 'POST'])
@jwt_required()
def comprehensive_study_plan():
    """Generates, stores, or fetches the master study plan and configuration."""
    user_id = int(get_jwt_identity())
    
    if request.method == 'GET':
        plan_record = UserStudyPlan.query.filter_by(user_id=user_id).first()
        if plan_record:
            return jsonify(plan_record.to_dict()), 200
        return jsonify({"plan": None, "preferences": {}}), 200

    # POST method
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be a valid JSON"}), 400

    assignments_list = data.get('assignments', [])
    available_hours = data.get('available_hours')
    session_length = data.get('session_length')
    break_interval = data.get('break_interval')

    # Convert available_hours, session_length, break_interval to floats/ints if present
    try:
        if available_hours is not None:
            available_hours = float(available_hours)
    except (ValueError, TypeError):
        available_hours = None

    try:
        if session_length is not None:
            session_length = int(session_length)
    except (ValueError, TypeError):
        session_length = None

    try:
        if break_interval is not None:
            break_interval = int(break_interval)
    except (ValueError, TypeError):
        break_interval = None

    plan_result = gemini.generate_master_study_plan(
        assignments_list, 
        available_hours=available_hours, 
        session_length=session_length, 
        break_interval=break_interval
    )

    # If successful generation, store it in the database
    if plan_result and "error" not in plan_result:
        prefs_dict = {
            "available_hours": available_hours,
            "session_length": session_length,
            "break_interval": break_interval
        }
        
        # Look for existing study plan record
        plan_record = UserStudyPlan.query.filter_by(user_id=user_id).first()
        if plan_record:
            plan_record.plan_json = json.dumps(plan_result)
            plan_record.preferences_json = json.dumps(prefs_dict)
            plan_record.updated_at = datetime.utcnow().isoformat() + "Z"
        else:
            plan_record = UserStudyPlan(
                user_id=user_id,
                plan_json=json.dumps(plan_result),
                preferences_json=json.dumps(prefs_dict),
                updated_at=datetime.utcnow().isoformat() + "Z"
            )
            db.session.add(plan_record)
        
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            # Log error but don't fail completely so the user still gets the generated plan
            print(f"Failed to store study plan in database: {str(e)}")

    return jsonify({
        "plan": plan_result,
        "preferences": {
            "available_hours": available_hours,
            "session_length": session_length,
            "break_interval": break_interval
        }
    }), 200


@ai_bp.route('/analytics-insights', methods=['POST'])
@jwt_required()
def analytics_insights():
    """Generates Gemini-powered academic productivity suggestions from real DB records."""
    user_id = int(get_jwt_identity())
    
    # Fetch real user assignments & study sessions from DB
    user_assignments = Assignment.query.filter_by(user_id=user_id).all()
    user_sessions = StudySession.query.filter_by(user_id=user_id).all()
    
    # Serialize for Gemini consumption
    assignments_list = [a.to_dict() for a in user_assignments]
    sessions_list = [s.to_dict() for s in user_sessions]
    
    # Get request body details for GPA target if provided
    data = request.get_json() or {}
    gpa_target = data.get('gpa_target', 3.5)
    
    insights_result = gemini.generate_productivity_insights(
        assignments_list=assignments_list,
        sessions_list=sessions_list,
        gpa_target=gpa_target
    )
    
    return jsonify(insights_result), 200


@ai_bp.route('/milestones', methods=['POST'])
@jwt_required()
def milestones():
    """Breaks down an assignment into structured milestones."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be a valid JSON"}), 400

    assignment_data = data.get('assignment', data)
    
    if not assignment_data:
        return jsonify({"error": "No assignment data provided in request"}), 400

    milestones_result = gemini.generate_milestones(assignment_data)
    return jsonify(milestones_result), 200


@ai_bp.route('/deadline-risk', methods=['POST'])
@jwt_required()
def deadline_risk():
    """Evaluates completion risk based on due dates and estimation parameters."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be a valid JSON"}), 400

    assignment_data = data.get('assignment')
    study_sessions = data.get('study_sessions', [])
    
    if not assignment_data:
        assignment_data = data
        study_sessions = []

    risk_result = gemini.analyze_deadline_risk(assignment_data, study_sessions)
    return jsonify(risk_result), 200


@ai_bp.route('/scan-assignment-ocr', methods=['POST'])
@jwt_required()
def scan_assignment_ocr():
    """Extracts text from uploaded assignment files (images/PDFs/Word docs/text) using Gemini Multimodal OCR."""
    import base64
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded. Please select an image, screenshot, or note."}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Empty file name."}), 400
        
    file_bytes = file.read()
    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()
    
    # Check if it is an image or PDF for multimodal processing (Gemini Vision)
    if ext in ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.pdf']:
        # Get appropriate mime type
        if ext == '.pdf':
            mime_type = "application/pdf"
        elif ext in ['.jpg', '.jpeg']:
            mime_type = "image/jpeg"
        elif ext == '.webp':
            mime_type = "image/webp"
        elif ext == '.gif':
            mime_type = "image/gif"
        else:
            mime_type = "image/png"
            
        # Base64 encode
        base64_data = base64.b64encode(file_bytes).decode('utf-8')
        
        # Invoke multimodal OCR using Gemini Vision
        extracted_text = gemini.perform_multimodal_ocr(base64_data, mime_type)
        return jsonify({
            "extractedText": extracted_text,
            "filename": filename,
            "isImage": ext != '.pdf'
        }), 200
    else:
        # Fallback to standard text extraction (DOCX, TXT)
        extracted_text = extract_text_from_file(file_bytes, filename)
        return jsonify({
            "extractedText": extracted_text,
            "filename": filename,
            "isImage": False
        }), 200


@ai_bp.route('/scan-assignment-fields', methods=['POST'])
@jwt_required()
def scan_assignment_fields():
    """Identifies title, course, dueDate, priority, difficulty, and other fields from raw text."""
    data = request.get_json()
    if not data or 'extractedText' not in data:
        return jsonify({"error": "Missing 'extractedText' field."}), 400
        
    extracted_text = data['extractedText']
    current_date_str = data.get('currentDate', datetime.utcnow().strftime("%Y-%m-%d"))
    
    result = gemini.identify_assignment_fields(extracted_text, current_date_str)
    return jsonify(result), 200



@ai_bp.route('/motivation', methods=['POST'])
@jwt_required()
def motivation():
    """Generates customized motivation nudges to help overcome student procrastination."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be a valid JSON"}), 400

    assignment_data = data.get('assignment', data)
    block_reason = data.get('block_reason', data.get('blockReason'))
    current_mood = data.get('current_mood', data.get('currentMood'))

    if not assignment_data:
        return jsonify({"error": "No assignment data provided in request"}), 400

    motivation_result = gemini.generate_motivation(assignment_data, block_reason, current_mood)
    return jsonify(motivation_result), 200


@ai_bp.route('/priorities', methods=['POST'])
@jwt_required()
def priorities():
    """Ranks and prioritizes a list of academic assignments."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be a valid JSON"}), 400

    # Accept either {"assignments": [...]} or raw array [...]
    assignments_list = data.get('assignments', data)
    
    if not isinstance(assignments_list, list):
        return jsonify({"error": "Assignments must be provided as a list/array"}), 400

    priority_result = gemini.prioritize_assignments(assignments_list)
    return jsonify(priority_result), 200


@ai_bp.route('/recommend-next-task', methods=['POST'])
@jwt_required()
def recommend_next_task_endpoint():
    """Generates AI study recommendation after completed sessions."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be a valid JSON"}), 400

    assignments = data.get('assignments', [])
    study_sessions = data.get('studySessions', data.get('study_sessions', []))
    active_assignment_id = data.get('activeAssignmentId')

    recommendation = gemini.recommend_next_task(assignments, study_sessions, active_assignment_id)
    return jsonify(recommendation), 200


def format_student_context(assignments, study_sessions):
    now_str = "2026-06-27"
    
    # Analyze assignments
    todo_assignments = []
    completed_assignments = []
    for a in assignments:
        status = a.get("status", "TODO")
        if status == "COMPLETED":
            completed_assignments.append(a)
        else:
            todo_assignments.append(a)
            
    context = []
    context.append(f"Current Date: {now_str}")
    context.append(f"Student Stats: {len(completed_assignments)} completed assignments, {len(todo_assignments)} pending assignments.")
    
    context.append("\nPENDING ASSIGNMENTS (WITH DETAILED PROGRESS & RISK ANALYSIS):")
    if not todo_assignments:
        context.append("- None! All caught up.")
    for idx, a in enumerate(todo_assignments, start=1):
        milestones = a.get("milestones", [])
        if not milestones and "milestones_json" in a:
            try:
                milestones = json.loads(a["milestones_json"])
            except Exception:
                pass
        
        # 1. Completion Progress (milestones)
        total_milestones = len(milestones)
        completed_m = sum(1 for m in milestones if m.get("completed", False))
        progress_pct = int((completed_m / total_milestones) * 100) if total_milestones > 0 else 0
        milestones_desc = f" ({completed_m}/{total_milestones} milestones completed, {progress_pct}% done)"
        
        # 2. Risk Analysis
        due_date = a.get('dueDate', a.get('due_date', 'N/A'))
        days_left = 3
        if due_date != 'N/A':
            try:
                from datetime import datetime
                due_dt = datetime.strptime(due_date[:10], "%Y-%m-%d")
                curr_dt = datetime.strptime(now_str, "%Y-%m-%d")
                days_left = (due_dt - curr_dt).days
            except Exception:
                pass
        
        est_hours = float(a.get('estimatedHours', a.get('estimated_hours', 5.0)))
        act_hours = float(a.get('actualHoursSpent', a.get('actual_hours_spent', 0.0)))
        hours_needed = max(0.0, est_hours - act_hours)
        
        if days_left <= 0:
            risk_level = "CRITICAL / OVERDUE"
        elif hours_needed > days_left * 4:
            risk_level = "HIGH RISK"
        elif hours_needed > days_left * 2 or days_left <= 2:
            risk_level = "MEDIUM RISK"
        else:
            risk_level = "LOW RISK"
            
        context.append(
            f"{idx}. {a.get('title')} ({a.get('course', 'General')}) "
            f"- Due: {due_date} ({days_left} days left) | "
            f"Priority: {a.get('priority', 'MEDIUM')} | "
            f"Difficulty: {a.get('difficulty', 'MEDIUM')} | "
            f"Weight: {a.get('weight', 10)}% | "
            f"Time spent: {act_hours}h / {est_hours}h estimated (Needs {hours_needed}h more) | "
            f"Completion progress: {milestones_desc} | "
            f"Risk analysis rating: {risk_level}"
        )
        if a.get('description'):
            context.append(f"   Description: {a.get('description')}")
            
    context.append("\nCOMPLETED ASSIGNMENTS:")
    if not completed_assignments:
        context.append("- None yet this semester.")
    for idx, a in enumerate(completed_assignments, start=1):
        context.append(f"- {a.get('title')} ({a.get('course', 'General')}) - Completed")

    # Calendar events (Upcoming study sessions and deadlines/milestones)
    context.append("\nCALENDAR EVENTS & PLANNED STUDY SCHEDULE (UPCOMING):")
    calendar_events = []
    
    # 1. Upcoming focus/study blocks
    upcoming_sessions = []
    past_sessions = []
    for s in study_sessions:
        date_raw = s.get("date", s.get("created_at", "2026-06-27T00:00:00Z"))
        date_str = date_raw.split("T")[0]
        if date_str > "2026-06-27":
            upcoming_sessions.append(s)
        else:
            past_sessions.append(s)
            
    if not upcoming_sessions:
        context.append("- No upcoming study focus blocks scheduled in the calendar.")
    for s in upcoming_sessions:
        duration = s.get("durationMinutes", s.get("duration_minutes", 0))
        date_raw = s.get("date", "N/A")
        date_str = date_raw.split("T")[0]
        time_str = date_raw.split("T")[1][:5] if "T" in date_raw else "N/A"
        context.append(f"- Scheduled Study Block: {s.get('courseCode', s.get('course_code', 'General'))} | Duration: {duration} mins | Date: {date_str} at {time_str} | Notes: {s.get('notes', 'None')}")

    context.append("\nSTUDY HISTORY & LOGS (PAST COMPLETED BLOCKS):")
    if not past_sessions:
        context.append("- No past completed sessions logged.")
    for s in past_sessions:
        duration = s.get("durationMinutes", s.get("duration_minutes", 0))
        date_str = s.get("date", s.get("created_at", "N/A")).split("T")[0]
        context.append(f"- Completed Session: {s.get('courseCode', s.get('course_code', 'General'))} | Duration: {duration} mins | Date: {date_str}")
        
    return "\n".join(context)


def get_ai_fallback_response(message, assignments, study_sessions):
    msg = message.lower()
    
    todo = [a for a in assignments if a.get("status") != "COMPLETED"]
    
    # helper for formatting assignments
    def get_assignment_title_course(a):
        return f"**{a.get('title')}** ({a.get('course', 'General')})"

    # Question 1: What should I study today?
    if "study today" in msg or "what to study" in msg or "study first" in msg:
        if not todo:
            return "🎉 **You are all caught up!** No pending assignments found. Today might be a perfect day to rest, read ahead, or review past topics."
        
        # Sort todo by priority & proximity
        sorted_todo = sorted(todo, key=lambda x: (
            x.get("dueDate", x.get("due_date", "9999-12-31")),
            {"URGENT": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}.get(x.get("priority", "MEDIUM"), 2)
        ))
        
        top_task = sorted_todo[0]
        res = f"### Today's Personalized Study Recommendation\n\nBased on your deadlines, completion progress, and risk factors, here is your focus plan for today (June 27, 2026):\n\n"
        res += f"1. **Primary Target: {get_assignment_title_course(top_task)}**\n"
        res += f"   - *Deadline:* Due on {top_task.get('dueDate', top_task.get('due_date'))}\n"
        res += f"   - *Priority:* **{top_task.get('priority')}**\n"
        res += f"   - *Action Plan:* Spend a focused **30-45 minutes** block on the next milestone. If you've been procrastinating, just aim for a 5-minute start!\n\n"
        
        if len(sorted_todo) > 1:
            second_task = sorted_todo[1]
            res += f"2. **Secondary Target: {get_assignment_title_course(second_task)}**\n"
            res += f"   - *Deadline:* Due on {second_task.get('dueDate', second_task.get('due_date'))}\n"
            res += f"   - *Action Plan:* Spend **15-20 minutes** on review or outline drafting to build early momentum.\n\n"
            
        res += "💡 *Tip: Head over to the **Focus Timer** tab, choose your primary target, and launch a Pomodoro session to stay dialed in!*"
        return res

    # Question 2: Which assignment is most important?
    elif "important" in msg or "priority" in msg or "most critical" in msg:
        if not todo:
            return "All of your assignments are complete! Awesome job staying ahead of your workload."
            
        # Prioritize by URGENT/HIGH, then weight, then deadline
        sorted_todo = sorted(todo, key=lambda x: (
            {"URGENT": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}.get(x.get("priority", "MEDIUM"), 2),
            -int(x.get("weight", 10)),
            x.get("dueDate", x.get("due_date", "9999-12-31"))
        ))
        
        main = sorted_todo[0]
        res = f"### Most Critical Assignment Analysis\n\nYour most important task is currently **{main.get('title')}** for **{main.get('course', 'General')}**.\n\n"
        res += f"- 📅 **Deadline:** {main.get('dueDate', main.get('due_date'))}\n"
        res += f"- ⚖️ **Grade Weight:** {main.get('weight', 10)}% of overall grade\n"
        res += f"- 🔥 **Priority Level:** {main.get('priority')}\n"
        res += f"- 📊 **Difficulty:** {main.get('difficulty', 'MEDIUM')}\n\n"
        res += f"**Why it is most important:** This task has the highest urgency profile based on grade weight, priority levels, and proximity to deadline. It requires about {main.get('estimatedHours', main.get('estimated_hours', 5))} hours of work.\n\n"
        res += f"👉 **Immediate Micro-Step:** Open your editor or reading material, spend 3 minutes reviewing the rubric, and write down 2 bullet points. Starting is the hardest part, let's beat procrastination together!"
        return res

    # Question 3: Generate tomorrow's study plan
    elif "tomorrow" in msg or "tomorrow's study plan" in msg or "plan for tomorrow" in msg:
        if not todo:
            return "🎉 **No pending tasks!** Tomorrow is wide open. Take a well-deserved break, or plan a light 20-minute reading session on a topic of interest."
            
        # Get up to 2 items
        sorted_todo = sorted(todo, key=lambda x: (
            x.get("dueDate", x.get("due_date", "9999-12-31")),
            {"URGENT": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}.get(x.get("priority", "MEDIUM"), 2)
        ))
        
        res = f"### Tomorrow's Study Plan (June 28, 2026) 🌅\n\n"
        res += "Here is a structured, realistic plan for tomorrow to maximize progress and keep your stress levels low:\n\n"
        
        # 9:00 AM - 10:30 AM
        task1 = sorted_todo[0]
        res += f"- **09:00 AM - 10:00 AM | Deep Focus on {task1.get('title')} ({task1.get('course')})**\n"
        res += f"  - *Goal:* Work on the next pending milestone. This is your highest-leverage task.\n"
        res += f"  - *Strategy:* Work in two 25-minute Pomodoro sessions with a 5-minute break in between.\n\n"
        
        # 10:00 AM - 10:15 AM
        res += "- **10:00 AM - 10:15 AM | Refreshment Break** ☕\n"
        res += "  - Stretch, grab water, get away from screens.\n\n"
        
        # 10:15 AM - 11:00 AM
        if len(sorted_todo) > 1:
            task2 = sorted_todo[1]
            res += f"- **10:15 AM - 11:00 AM | Secondary focus on {task2.get('title')} ({task2.get('course')})**\n"
            res += f"  - *Goal:* Outline your next section, review lecture slides, or clear small hurdles.\n"
        else:
            res += f"- **10:15 AM - 11:00 AM | Review & Polish**\n"
            res += f"  - Review what you completed today, plan ahead, or study course notes.\n"
            
        res += "\n💡 *Consistency beats intensity. Sticking to this simple 1.5-hour block tomorrow will keep you on track and stress-free!*"
        return res

    # Question 4: Help me prepare for exams
    elif "exam" in msg or "test prep" in msg or "exam prep" in msg or "midterm" in msg or "final" in msg or "prepare for" in msg:
        # Find tasks containing exam, test, quiz, midterm, final
        exams = [a for a in todo if any(keyword in a.get("title", "").lower() or keyword in a.get("description", "").lower() for keyword in ["exam", "test", "quiz", "midterm", "final"])]
        
        res = "### Personalized Exam Preparation Guide 🎯\n\n"
        
        if exams:
            res += "I detected the following upcoming assessments in your schedule:\n"
            for e in exams:
                res += f"- **{e.get('title')}** for **{e.get('course')}** (Due: {e.get('dueDate', e.get('due_date'))})\n"
            res += "\n"
            res += "**Your Custom Prep Roadmap:**\n"
            for e in exams:
                res += f"1. **{e.get('title')} Prep Block (60 mins):**\n"
                res += "   - *Spaced Repetition:* Break down topics into small units. Review them today, 2 days from now, and the night before.\n"
                res += "   - *Active Recall:* Create flashcards or write explanations from memory instead of just re-reading notes.\n"
        else:
            # General Exam prep guidance
            res += "I don't see any assignments explicitly labeled as 'Exams' or 'Tests' in your pending list, but here is a highly effective scientific prep strategy for your current courses:\n\n"
            courses = list(set([a.get("course", "General") for a in todo]))
            if not courses:
                courses = ["your academic courses"]
                
            res += f"For your courses ({', '.join(courses)}):\n"
            res += "1. **Active Recall (The Gold Standard):** Close your book/notes and write down everything you can remember about a key topic. Then open your notes to fill in the gaps with red ink.\n"
            res += "2. **Feynman Technique:** Explain difficult concepts to a hypothetical 10-year-old in simple terms. This exposes hidden gaps in your understanding instantly.\n"
            res += "3. **Practice Under Pressure:** Do practice questions under timed, exam-like conditions to build confidence and mental endurance.\n"
            
        res += "\n💡 *Tip: Create high-contrast summary sheets for each course and review them during 15-minute scheduled study blocks!*"
        return res

    # Question 5: Explain this assignment
    elif "explain" in msg or "help me understand" in msg:
        # Check if they specified a matching name
        matched = None
        for a in todo:
            if a.get("title").lower() in msg or a.get("course").lower() in msg:
                matched = a
                break
        
        if matched:
            desc = matched.get("description", "No description provided.")
            res = f"### Assignment Breakdown: {matched.get('title')} ({matched.get('course')})\n\n"
            res += f"**Overview:**\n{desc}\n\n"
            res += f"**Recommended Action Checklist:**\n"
            res += f"1. **Deconstruct instructions:** Identify the core deliverables and grading criteria.\n"
            res += f"2. **Gather reference material:** Check lecture slides, chapters, or syllabus guidelines.\n"
            res += f"3. **Write a skeleton:** Draft your file headers or section titles to overcome empty-page syndrome.\n\n"
            res += f"Need detailed help? Ask me any specific academic questions about the concepts involved!"
            return res
        else:
            if todo:
                first = todo[0]
                return f"Which assignment would you like me to explain? I can help with **{first.get('title')}** or any of your other pending coursework. Just tell me the title or course code!"
            return "I don't see any pending assignments to explain! Feel free to add assignments using the scanner or form first."

    # Question 6: Procrastination / stuck
    elif "procrastinat" in msg or "stuck" in msg or "lazy" in msg or "motivation" in msg:
        if not todo:
            return "No tasks pending! Go enjoy some well-deserved, guilt-free free time."
            
        first = todo[0]
        res = "### Overcoming Procrastination 🧠\n\n"
        res += "It is completely normal to feel stuck. Procrastination is usually a response to feeling overwhelmed or bored, not laziness. Let's make starting feel incredibly easy.\n\n"
        res += f"Let's focus only on **{first.get('title')}** ({first.get('course')}). Do not worry about finishing it right now.\n\n"
        res += "**Your 5-Minute Micro-Step Challenge:**\n"
        res += "1. Set a timer for **5 minutes** (using our Focus Timer tab!).\n"
        res += "2. Open the file or document for this assignment.\n"
        res += "3. Spend just 5 minutes writing down a few notes or drafting one sentence.\n"
        res += "4. When the timer rings, you have permission to stop if you want.\n\n"
        res += "Ready? Let's take that tiny action step!"
        return res

    # Question 7: General / Study schedule
    elif "schedule" in msg or "study calendar" in msg or "plan my week" in msg:
        if not todo:
            return "Since you have no pending assignments, a relaxation schedule is highly recommended! If you want to study, pick a topic you enjoy and spend 30 minutes reading."
            
        res = "### Proposed Study Schedule\n\nHere is a structured, balanced schedule to manage your workload over the next few days:\n\n"
        res += "| Date | Course & Task | Study Block | Goal / Focus |\n"
        res += "| :--- | :--- | :--- | :--- |\n"
        
        days_offset = ["Today", "Tomorrow", "Day after tomorrow"]
        for idx, day in enumerate(days_offset):
            if idx < len(todo):
                task = todo[idx]
                res += f"| {day} | **{task.get('course')}**: {task.get('title')} | 45 min | Work on next milestone |\n"
            else:
                res += f"| {day} | *Catch up / Buffer Day* | 30 min | Review concepts or rest |\n"
                
        res += "\nRemember to take 5-minute breaks after every 25 minutes of studying to stay fresh."
        return res

    # Generic academic greeting/guidance
    else:
        pending_str = f"you have **{len(todo)} pending assignments**" if todo else "you are all caught up on your assignments"
        return f"Hello! I am your **AI Study Assistant**. I'm here to help you coordinate your academic life.\n\n" \
               f"Currently, {pending_str}.\n\n" \
               f"Here are a few questions you can ask me:\n" \
               f"- 📚 *\"What should I study today?\"*\n" \
               f"- 📝 *\"Explain this assignment.\"*\n" \
               f"- 🌅 *\"Generate tomorrow's study plan.\"*\n" \
               f"- 🎯 *\"Help me prepare for exams.\"*\n" \
               f"- 🏆 *\"Which assignment is most important?\"*\n\n" \
               f"Or just tell me what academic topic is on your mind!"


@ai_bp.route('/voice-assistant', methods=['POST'])
@jwt_required()
def voice_assistant():
    """AI Voice Assistant conversational endpoint that processes speech or text command."""
    current_user_id = get_jwt_identity()
    data = request.get_json() or {}
    message = data.get('message', '')
    
    if not message:
        return jsonify({"error": "Message is required"}), 400

    try:
        # Fetch actual real-time assignments and study sessions for personalization
        user_assignments = Assignment.query.filter_by(user_id=current_user_id).all()
        user_sessions = StudySession.query.filter_by(user_id=current_user_id).all()
        
        assignments_list = [a.to_dict() for a in user_assignments]
        sessions_list = [s.to_dict() for s in user_sessions]
        
        student_context = format_student_context(assignments_list, sessions_list)
        
        # Build prompt for Gemini to decide response and action
        prompt = f"""
        Student Query: "{message}"
        
        Generate the appropriate voice assistant response and action.
        """
        
        system_instruction = (
            "You are the voice interface for SmartDeadline AI, a conversational and helpful AI tutor.\n"
            "Your job is to understand the student's voice command, respond with an audio-friendly conversational text, and trigger an action if needed.\n\n"
            "Today's Date is Sunday, June 28, 2026. Next Monday is July 6, 2026.\n\n"
            "Below is the student's current academic state:\n"
            f"{student_context}\n\n"
            "You MUST return a strictly valid JSON object matching this schema:\n"
            "{\n"
            "  \"response_text\": \"A short, friendly verbal reply (1-3 sentences max) optimized for text-to-speech synthesis. Be encouraging and clear.\",\n"
            "  \"action\": {\n"
            "    \"type\": \"NAVIGATE\" | \"ADD_ASSIGNMENT\" | \"NONE\",\n"
            "    \"tab\": \"dashboard\" | \"assignments\" | \"study-planner\" | \"copilot\" | \"syllabus-scanner\" | \"assignment-scanner\" | \"notifications\" | \"academic-calendar\" | \"procrastination\" | \"focus-timer\" | \"analytics\" | \"export-center\" | \"weekly-review\" | \"deadline-predictor\" | \"profile\",\n"
            "    \"assignment\": {\n"
            "       \"title\": \"string (The parsed name of the assignment)\",\n"
            "       \"course\": \"string (e.g. CS-101)\",\n"
            "       \"dueDate\": \"YYYY-MM-DD (Calculated relative to Sunday June 28, 2026)\",\n"
            "       \"priority\": \"LOW\" | \"MEDIUM\" | \"HIGH\" | \"URGENT\",\n"
            "       \"difficulty\": \"LOW\" | \"MEDIUM\" | \"HIGH\",\n"
            "       \"weight\": 10,\n"
            "       \"estimatedHours\": 5,\n"
            "       \"description\": \"Created via Voice Assistant.\"\n"
            "    }\n"
            "  }\n"
            "}\n\n"
            "GUIDELINES:\n"
            "1. If the student asks to open, show, or navigate to a tab/page, set type to 'NAVIGATE' and specify the target 'tab' (e.g., 'academic-calendar', 'analytics', etc.).\n"
            "2. If the student asks to add or create an assignment, set type to 'ADD_ASSIGNMENT' and fill the 'assignment' object with parsed values. Guess a course code if not specified.\n"
            "3. If the student asks a question like 'What should I study today?', give a personalized answer from their context, set type to 'NAVIGATE', and set tab to 'focus-timer' or 'dashboard' or 'study-planner' as a helpful guide.\n"
            "4. If no specific action is needed, set type to 'NONE'.\n"
            "5. Do NOT output any backticks, markdown markers, or extra text. Output ONLY valid JSON."
        )
        
        result = gemini._call_gemini_api(prompt, system_instruction=system_instruction, json_mode=True)
        
        # If Gemini returned fallback or is empty
        if not result or "error" in result:
            # Fallback handling
            response_text = get_ai_fallback_response(message, assignments_list, sessions_list)
            action_type = "NONE"
            tab_val = "dashboard"
            
            msg_lower = message.lower()
            if "calendar" in msg_lower or "schedule" in msg_lower:
                action_type = "NAVIGATE"
                tab_val = "academic-calendar"
            elif "analytic" in msg_lower:
                action_type = "NAVIGATE"
                tab_val = "analytics"
            elif "task" in msg_lower or "assignment" in msg_lower:
                action_type = "NAVIGATE"
                tab_val = "assignments"
            elif "syllabus" in msg_lower:
                action_type = "NAVIGATE"
                tab_val = "syllabus-scanner"
                
            result = {
                "response_text": response_text.replace("**", "").replace("###", "").replace("#", ""), # clean markdown for TTS
                "action": {
                    "type": action_type,
                    "tab": tab_val
                }
            }
            
        # If the action is ADD_ASSIGNMENT, let's create the assignment directly in SQLite so it persists
        if result.get("action", {}).get("type") == "ADD_ASSIGNMENT":
            asg_data = result["action"].get("assignment")
            if asg_data and asg_data.get("title"):
                task_id = f"assignment-{int(datetime.utcnow().timestamp() * 1000)}-{uuid.uuid4().hex[:6]}"
                
                # Default milestones
                milestones_list = [
                    {"id": f"milestone-{uuid.uuid4().hex[:8]}-0", "title": "Initial research & outline prep", "completed": False},
                    {"id": f"milestone-{uuid.uuid4().hex[:8]}-1", "title": "Draft main content & solutions", "completed": False},
                    {"id": f"milestone-{uuid.uuid4().hex[:8]}-2", "title": "Final review and submission check", "completed": False}
                ]
                
                new_assignment = Assignment(
                    id=task_id,
                    user_id=current_user_id,
                    title=asg_data.get("title"),
                    course=asg_data.get("course", "GEN-101"),
                    due_date=asg_data.get("dueDate", datetime.utcnow().strftime("%Y-%m-%d")),
                    status="TODO",
                    priority=asg_data.get("priority", "MEDIUM"),
                    difficulty=asg_data.get("difficulty", "MEDIUM"),
                    weight=asg_data.get("weight", 10),
                    estimated_hours=float(asg_data.get("estimatedHours", 5.0)),
                    actual_hours_spent=0.0,
                    description=asg_data.get("description", "Created via Voice Assistant."),
                    milestones_json=json.dumps(milestones_list),
                    study_plan="",
                    created_at=datetime.utcnow().isoformat() + "Z"
                )
                
                db.session.add(new_assignment)
                db.session.commit()
                
                # Replace parsed assignment object with the actual saved model's serialized dict
                result["action"]["assignment"] = new_assignment.to_dict()
                result["response_text"] = f"I have created the assignment '{new_assignment.title}' under course {new_assignment.course}, due on {new_assignment.due_date}. Check your assignment list!"

        return jsonify(result), 200
        
    except Exception as e:
        print(f"Error in Voice Assistant route: {str(e)}")
        # Ultimate fallback so we never crash
        return jsonify({
            "response_text": "I'm sorry, I encountered a temporary error processing your request. Please try again.",
            "action": {"type": "NONE"}
        }), 200


@ai_bp.route('/chat', methods=['POST'])
@jwt_required()
def chat_assistant():
    """AI Study Assistant conversational endpoint."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be a valid JSON"}), 400

    message = data.get('message', '')
    history = data.get('history', [])
    assignments = data.get('assignments', [])
    study_sessions = data.get('studySessions', [])

    if not message:
        return jsonify({"error": "Message is required"}), 400

    # Build Gemini history format
    contents = []
    for h in history:
        role = h.get("role")
        if role in ["assistant", "bot", "model"]:
            role = "model"
        else:
            role = "user"
        contents.append({
            "role": role,
            "parts": [{"text": h.get("content", "")}]
        })

    # Add current user message
    contents.append({
        "role": "user",
        "parts": [{"text": message}]
    })

    # Build System Instruction with student context
    student_context = format_student_context(assignments, study_sessions)
    system_instruction = (
        "You are an intelligent, empathetic, and highly capable AI Study Assistant designed to support students "
        "by managing their study schedules, prioritizing tasks, suggesting direct micro-steps to defeat procrastination, "
        "explaining difficult assignments clearly, and preparing study plans.\n"
        "You communicate conversationally, like an encouraging peer.\n\n"
        f"{student_context}\n\n"
        "INSTRUCTIONS FOR CHAT INTERACTIONS:\n"
        "1. Answer concisely, using clear markdown formatting. Use lists, tables, bold text, and code blocks as appropriate.\n"
        "2. Keep the current date (June 27, 2026) in mind when answering questions about dates or due dates.\n"
        "3. When asked 'What should I study today?', use the pre-calculated risk analysis, priority, and deadlines to recommend 1-2 tasks from the pending list and specify a tiny 15-30 minute focused session plan.\n"
        "4. When asked 'Which assignment is most important?', identify the most urgent assignment based on priority level, weight, deadlines, and risk rating, explain why, and give an encouraging micro-step to start it.\n"
        "5. When asked 'Generate tomorrow's study plan.', draft a realistic study roadmap specifically for tomorrow (June 28, 2026) with timed session blocks to tackle high-priority or high-risk pending items.\n"
        "6. When asked 'Help me prepare for exams.', identify any upcoming assessments labeled as tests or exams, outline high-yield active recall strategies, study schedules, and exam preparation tips based on current courses and progress.\n"
        "7. When asked 'Explain this assignment.', look for matching titles or course codes in the pending assignment list, explain the steps, and give a supportive tip.\n"
        "8. Always stay encouraging, humble, and practical. Speak to the student with validation, but direct them to simple, actionable micro-steps."
    )

    result = gemini.generate_chat_response(contents, system_instruction=system_instruction)

    # If Gemini failed or is not available, trigger robust, intelligent fallback responses
    if "fallback" in result:
        fallback_text = get_ai_fallback_response(message, assignments, study_sessions)
        return jsonify({"text": fallback_text, "fallback": True, "api_info": result.get("error")}), 200

    return jsonify(result), 200


@ai_bp.route('/copilot', methods=['POST'])
@jwt_required()
def academic_copilot():
    current_user_id = get_jwt_identity()
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be a valid JSON"}), 400

    message = data.get('message', '')
    history = data.get('history', [])
    assignments = data.get('assignments', [])
    study_sessions = data.get('studySessions', [])

    if not message:
        return jsonify({"error": "Message is required"}), 400

    # Format the student's existing tasks, deadlines, and workload for Gemini
    student_context = format_student_context(assignments, study_sessions)
    
    system_instruction = (
        "You are the AI Academic Copilot, an elite cognitive tutor and academic strategist. "
        "Your goal is to help the student formulate a highly tailored study plan by analyzing their "
        "existing assignments, deadlines, recent focus sessions, and their natural language description of their situation.\n\n"
        f"{student_context}\n\n"
        "You must output a strictly valid JSON response matching this schema:\n"
        "{\n"
        "  \"schedule\": [\n"
        "    {\n"
        "      \"time_block\": \"string (e.g. 'Monday Evening: 6:00 PM - 8:00 PM')\",\n"
        "      \"focus_area\": \"string (e.g. 'Database Schema Design')\",\n"
        "      \"tasks\": [\"string (associated assignment titles)\"],\n"
        "      \"details\": \"string (description of what to accomplish, study tips, etc.)\"\n"
        "    }\n"
        "  ],\n"
        "  \"priorities\": [\n"
        "    {\n"
        "      \"title\": \"string (assignment title or topic)\",\n"
        "      \"rank\": 1,\n"
        "      \"reason\": \"string (clear rationale based on weight or deadline)\"\n"
        "    }\n"
        "  ],\n"
        "  \"breaks\": {\n"
        "    \"type\": \"string (e.g. '50/10 Pomodoro Buffer')\",\n"
        "    \"description\": \"string (burnout prevention tips)\"\n"
        "  },\n"
        "  \"risk_analysis\": {\n"
        "    \"level\": \"string (LOW, MEDIUM, HIGH, or CRITICAL)\",\n"
        "    \"score\": 45,\n"
        "    \"explanation\": \"string (clear timeline and workload risk evaluation)\"\n"
        "  },\n"
        "  \"completion_probability\": 85,\n"
        "  \"motivation\": \"string (encouraging, realistic pep talk)\"\n"
        "}\n\n"
        "Guidelines:\n"
        "- Current Date is June 27, 2026. Keep this in mind when scheduling and prioritizing.\n"
        "- Factor in the user's input/request (e.g., 'I only have 4 hours tomorrow') to adjust the schedule blocks to strictly fit within those constraints.\n"
        "- Identify risk levels and completion probabilities accurately by comparing the total estimated hours needed, number of days left, and the student's constraints.\n"
        "- Be extremely encouraging but strategically realistic. If there is a high likelihood of missing a deadline, flag it as HIGH/CRITICAL risk and suggest adjustments.\n"
        "- Do not return any markdown wrappers like ```json. Return raw JSON strictly."
    )

    # Formulate a prompt containing previous dialogue and the new message to maintain history context
    history_str = ""
    for h in history:
        role = "Student" if h.get("role") == "user" else "Copilot"
        history_str += f"{role}: {h.get('content')}\n"

    prompt = (
        f"Conversation History:\n{history_str}\n"
        f"Student's Current Situation / New Input: \"{message}\"\n\n"
        "Analyze the situation, existing tasks, and available study time constraints. "
        "Formulate the updated Study Schedule, Priorities, Breaks, Risk Analysis, Completion Probability, and Motivation."
    )

    result = gemini._call_gemini_api(prompt, system_instruction=system_instruction, json_mode=True)
    
    # Handle Fallback if API fails
    if "fallback" in result:
        # Generate offline/fallback JSON plan
        fallback_priorities = []
        for i, a in enumerate(assignments[:3], start=1):
            fallback_priorities.append({
                "title": a.get("title", "Syllabus Task"),
                "rank": i,
                "reason": f"Ranked based on approaching deadline ({a.get('dueDate', a.get('due_date'))}) and {a.get('priority')} priority."
            })
            
        fallback_schedule = []
        for a in assignments[:2]:
            fallback_schedule.append({
                "time_block": "Upcoming Focus Session (2 Hours)",
                "focus_area": f"Draft/Prep for {a.get('title')}",
                "tasks": [a.get("title")],
                "details": "Conduct deep review, draft outline, and tackle initial milestones."
            })
        if not fallback_schedule:
            fallback_schedule.append({
                "time_block": "General Study Block (2 Hours)",
                "focus_area": "Review notes and course materials",
                "tasks": ["General Studies"],
                "details": "Establish steady study rhythms and review upcoming syllabi."
            })
            
        fallback_plan = {
            "schedule": fallback_schedule,
            "priorities": fallback_priorities or [{"title": "General Academic Review", "rank": 1, "reason": "No pending assignments in local queue."}],
            "breaks": {
                "type": "50/10 Spaced Rest",
                "description": "Take 10 minutes to walk around, hydrate, and stretch after every 50 minutes of studying."
            },
            "risk_analysis": {
                "level": "MEDIUM" if len(assignments) > 2 else "LOW",
                "score": 40 if len(assignments) > 2 else 15,
                "explanation": "Calculated in offline mode. Maintain steady progress to avoid cramming."
            },
            "completion_probability": 85 if len(assignments) <= 2 else 65,
            "motivation": "You have full capability to execute on these tasks! Break them down, set a timer, and tackle the first small step."
        }
        return jsonify(fallback_plan), 200

    return jsonify(result), 200


@ai_bp.route('/copilot/messages', methods=['GET'])
@jwt_required()
def get_copilot_messages():
    """Fetch all stored copilot chat messages from the database for the current user."""
    current_user_id = get_jwt_identity()
    try:
        messages = CopilotMessage.query.filter_by(user_id=current_user_id).order_by(CopilotMessage.timestamp.asc()).all()
        return jsonify([m.to_dict() for m in messages]), 200
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500


@ai_bp.route('/copilot/messages', methods=['POST'])
@jwt_required()
def save_copilot_message():
    """Save a new chat message into the database for the current user."""
    current_user_id = get_jwt_identity()
    data = request.get_json() or {}
    role = data.get('role')
    content = data.get('content')
    plan = data.get('plan')

    if not role or not content:
        return jsonify({"error": "Role and content are required."}), 400

    try:
        msg_id = f"msg-{int(datetime.utcnow().timestamp() * 1000)}-{uuid.uuid4().hex[:6]}"
        plan_json = json.dumps(plan) if plan else None

        new_msg = CopilotMessage(
            id=msg_id,
            user_id=current_user_id,
            role=role,
            content=content,
            timestamp=datetime.utcnow().isoformat() + "Z",
            plan_json=plan_json
        )
        db.session.add(new_msg)
        db.session.commit()
        return jsonify(new_msg.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500


@ai_bp.route('/copilot/messages', methods=['DELETE'])
@jwt_required()
def clear_copilot_messages():
    """Delete all stored copilot chat messages from the database for the current user."""
    current_user_id = get_jwt_identity()
    try:
        CopilotMessage.query.filter_by(user_id=current_user_id).delete()
        db.session.commit()
        return jsonify({"message": "Copilot conversation history cleared from database."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500


@ai_bp.route('/predict', methods=['POST'])
@jwt_required()
def run_and_save_prediction():
    """Generates a comprehensive dynamic AI timeline prediction and stores it in history."""
    current_user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    assignment_data = data.get('assignment')
    study_sessions = data.get('study_sessions', [])
    
    if not assignment_data:
        return jsonify({"error": "Assignment data is required for forecasting"}), 400
        
    try:
        all_user_assignments = Assignment.query.filter_by(user_id=current_user_id).all()
        all_assignments_list = [a.to_dict() for a in all_user_assignments]
        
        result = gemini.generate_ai_predictions(
            assignment_data, 
            study_sessions, 
            all_assignments_list
        )
        
        pred_id = f"pred-{int(datetime.utcnow().timestamp() * 1000)}-{uuid.uuid4().hex[:6]}"
        interventions_json = json.dumps(result.get("interventions", []))
        
        new_prediction = AIPrediction(
            id=pred_id,
            user_id=current_user_id,
            assignment_id=assignment_data.get("id"),
            timestamp=datetime.utcnow().isoformat() + "Z",
            risk_level=result.get("risk_level", "MEDIUM"),
            risk_score=result.get("risk_score", 50),
            completion_probability=result.get("completion_probability", 50),
            expected_completion=result.get("expected_completion", "Projected On Time"),
            study_workload=result.get("study_workload", "Balanced: 1.5h/day"),
            stress_level=result.get("stress_level", "Moderate (5/10)"),
            productivity_score=result.get("productivity_score", 70),
            confidence_score=result.get("confidence_score", 85),
            analysis=result.get("analysis", "No detailed reasoning provided."),
            interventions_json=interventions_json
        )
        
        db.session.add(new_prediction)
        db.session.commit()
        
        return jsonify(new_prediction.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Database or AI processing error: {str(e)}"}), 500


@ai_bp.route('/predictions', methods=['GET'])
@jwt_required()
def get_prediction_history():
    """Retrieves all stored timeline predictions for the authenticated student."""
    current_user_id = get_jwt_identity()
    try:
        predictions = AIPrediction.query.filter_by(user_id=current_user_id).order_by(AIPrediction.timestamp.desc()).all()
        return jsonify([p.to_dict() for p in predictions]), 200
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500


@ai_bp.route('/predictions', methods=['DELETE'])
@jwt_required()
def clear_prediction_history():
    """Deletes all stored prediction records for the current user."""
    current_user_id = get_jwt_identity()
    try:
        AIPrediction.query.filter_by(user_id=current_user_id).delete()
        db.session.commit()
        return jsonify({"message": "Prediction history successfully cleared."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500



