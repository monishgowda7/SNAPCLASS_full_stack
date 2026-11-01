import os
import sys
import io
import base64
import time
from datetime import datetime

# If executed via `streamlit run app.py`, seamlessly run the Streamlit version
if any("streamlit" in str(arg).lower() for arg in sys.argv):
    try:
        from streamlit.runtime.scriptrunner import get_script_run_ctx
        if get_script_run_ctx():
            import app_streamlit
            app_streamlit.main()
            sys.exit(0)
    except Exception:
        pass

from PIL import Image
import numpy as np
import pandas as pd
import segno

from flask import (
    Flask, render_template, request, jsonify, session, redirect, url_for, send_file
)

# Existing backend modules (kept 100% intact)
from src.database.config import supabase
from src.database.db import (
    check_teacher_exists,
    create_teacher,
    teacher_login,
    get_all_students,
    create_student,
    create_subject,
    get_teacher_subjects,
    enroll_student_to_subject,
    unenroll_student_to_subject,
    get_student_subjects,
    get_student_attendance,
    create_attendance,
    get_attendance_for_teacher,
)
from src.pipeline.face_pipeline import (
    predict_attendance,
    get_face_embedding,
    train_classifier
)
from src.pipeline.voice_pipeline import (
    get_voice_embedding,
    process_bulk_audio
)

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "snapclass_secure_attendance_key_2026")


# Helper: Decode base64 or file upload to RGB numpy array
def parse_image_to_numpy(image_data):
    try:
        if isinstance(image_data, str) and image_data.startswith("data:image"):
            # Strip base64 header (e.g. data:image/jpeg;base64,...)
            header, encoded = image_data.split(",", 1)
            img_bytes = base64.b64decode(encoded)
            pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
            return np.array(pil_img)
        elif hasattr(image_data, "read"):
            pil_img = Image.open(image_data).convert("RGB")
            return np.array(pil_img)
        elif isinstance(image_data, bytes):
            pil_img = Image.open(io.BytesIO(image_data)).convert("RGB")
            return np.array(pil_img)
    except Exception as e:
        print("Error parsing image to numpy:", e)
    return None


# ==========================================
# PAGE ROUTES
# ==========================================

@app.route("/")
def index():
    join_code = request.args.get("join-code")
    if join_code:
        return redirect(url_for("student_view", **{"join-code": join_code}))
    return render_template("index.html")


@app.route("/student")
def student_view():
    if session.get("user_role") == "student" and session.get("student_data"):
        join_code = request.args.get("join-code")
        if join_code:
            return redirect(url_for("student_dashboard", **{"join-code": join_code}))
        return redirect(url_for("student_dashboard"))

    return render_template("student_login.html")


@app.route("/student/dashboard")
def student_dashboard():
    if session.get("user_role") != "student" or not session.get("student_data"):
        return redirect(url_for("student_view"))

    student = session["student_data"]
    student_id = student["student_id"]

    subjects = get_student_subjects(student_id)
    logs = get_student_attendance(student_id)

    stats_map = {}
    for log in logs:
        sid = log.get("subject_id")
        if sid not in stats_map:
            stats_map[sid] = {"total": 0, "attended": 0}
        stats_map[sid]["total"] += 1
        if log.get("is_present"):
            stats_map[sid]["attended"] += 1

    return render_template(
        "student_dashboard.html",
        student=student,
        subjects=subjects,
        stats_map=stats_map
    )


@app.route("/teacher")
def teacher_view():
    if session.get("user_role") == "teacher" and session.get("teacher_data"):
        return redirect(url_for("teacher_dashboard"))

    return render_template("teacher_auth.html")


@app.route("/teacher/dashboard")
def teacher_dashboard():
    if session.get("user_role") != "teacher" or not session.get("teacher_data"):
        return redirect(url_for("teacher_view"))

    teacher = session["teacher_data"]
    teacher_id = teacher["teacher_id"]

    subjects = get_teacher_subjects(teacher_id)
    records = get_attendance_for_teacher(teacher_id)

    records_summary = []
    if records:
        data = []
        for r in records:
            ts = r.get("timestamp")
            sub = r.get("subject") or {}
            data.append({
                "ts_group": ts.split(".")[0] if ts else None,
                "Time": datetime.fromisoformat(ts).strftime("%Y-%m-%d %I:%M %p") if ts else "N/A",
                "Subject": sub.get("subject_name", ""),
                "Subject Code": sub.get("subject_code", ""),
                "is_present": bool(r.get("is_present", False))
            })

        if data:
            df = pd.DataFrame(data)
            summary = (
                df.groupby(["ts_group", "Time", "Subject", "Subject Code"])
                .agg(
                    Present_Count=("is_present", "sum"),
                    Total_Count=("is_present", "count")
                ).reset_index()
            )
            summary["Attendance Stats"] = (
                "✅ " + summary["Present_Count"].astype(str) + " / "
                + summary["Total_Count"].astype(str) + " Students"
            )
            display_df = summary.sort_values(by="ts_group", ascending=False)
            records_summary = display_df.to_dict(orient="records")

    return render_template(
        "teacher_dashboard.html",
        teacher=teacher,
        subjects=subjects,
        records_summary=records_summary
    )


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("index"))


# ==========================================
# STUDENT API ENDPOINTS
# ==========================================

@app.route("/api/student/login_face", methods=["POST"])
def api_student_login_face():
    data = request.get_json(silent=True) or {}
    image_str = data.get("image")

    if not image_str:
        return jsonify({"success": False, "message": "No image provided"}), 400

    img_np = parse_image_to_numpy(image_str)
    if img_np is None:
        return jsonify({"success": False, "message": "Invalid image format"}), 400

    detected, all_ids, num_faces = predict_attendance(img_np)

    if num_faces == 0:
        return jsonify({"success": False, "message": "Face not found! Please position your face in the center."})
    elif num_faces > 1:
        return jsonify({"success": False, "message": "Multiple faces found. Please ensure only one person is in frame."})
    else:
        if detected:
            student_id = list(detected.keys())[0]
            all_students = get_all_students()
            student = next((s for s in all_students if s["student_id"] == student_id), None)
            if student:
                session["user_role"] = "student"
                session["student_data"] = student
                return jsonify({
                    "success": True,
                    "student": student,
                    "redirect": url_for("student_dashboard")
                })

        return jsonify({
            "success": False,
            "not_recognized": True,
            "message": "Face not recognized! You might be a new student. Register below."
        })


@app.route("/api/student/register", methods=["POST"])
def api_student_register():
    name = request.form.get("name")
    face_image_data = request.form.get("face_image")
    face_file = request.files.get("face_file")
    voice_file = request.files.get("voice_audio")

    if not name:
        return jsonify({"success": False, "message": "Please enter your name"}), 400

    img_np = None
    if face_file:
        img_np = parse_image_to_numpy(face_file)
    elif face_image_data:
        img_np = parse_image_to_numpy(face_image_data)

    if img_np is None:
        return jsonify({"success": False, "message": "Face image is required for registration"}), 400

    encodings = get_face_embedding(img_np)
    if not encodings:
        return jsonify({"success": False, "message": "Could not capture facial features for registration"}), 400

    face_emb = encodings[0].tolist()

    voice_emb = None
    if voice_file:
        try:
            audio_bytes = voice_file.read()
            v_emb = get_voice_embedding(audio_bytes)
            if v_emb is not None:
                voice_emb = v_emb.tolist()
        except Exception as e:
            print("Voice extraction error during registration:", e)

    response_data = create_student(name, face_embedding=face_emb, voice_embedding=voice_emb)
    if response_data:
        train_classifier()
        student = response_data[0]
        session["user_role"] = "student"
        session["student_data"] = student
        return jsonify({
            "success": True,
            "message": f"Profile created successfully! Welcome {name}!",
            "redirect": url_for("student_dashboard")
        })

    return jsonify({"success": False, "message": "Failed to create student account in database"}), 500


@app.route("/api/student/enroll", methods=["POST"])
def api_student_enroll():
    if session.get("user_role") != "student" or not session.get("student_data"):
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    student_id = session["student_data"]["student_id"]
    data = request.get_json(silent=True) or {}
    join_code = data.get("subject_code", "").strip()

    if not join_code:
        return jsonify({"success": False, "message": "Please enter a subject code"}), 400

    res = supabase.table("subject").select("subject_id, subject_name, subject_code").eq("subject_code", join_code).execute()
    if not res.data:
        return jsonify({"success": False, "message": "Subject code not found"}), 404

    subject_data = res.data[0]
    subject_id = subject_data["subject_id"]

    check = supabase.table("subject_students").select("*").eq("subject_id", subject_id).eq("student_id", student_id).execute()
    if check.data:
        return jsonify({"success": False, "message": "You are already enrolled in this subject"})

    enroll_student_to_subject(student_id, subject_id)
    return jsonify({
        "success": True,
        "message": f"Successfully enrolled in {subject_data['subject_name']}!"
    })


@app.route("/api/student/unenroll", methods=["POST"])
def api_student_unenroll():
    if session.get("user_role") != "student" or not session.get("student_data"):
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    student_id = session["student_data"]["student_id"]
    data = request.get_json(silent=True) or {}
    subject_id = data.get("subject_id")

    if not subject_id:
        return jsonify({"success": False, "message": "Subject ID required"}), 400

    unenroll_student_to_subject(student_id, subject_id)
    return jsonify({"success": True, "message": "Unenrolled successfully!"})


@app.route("/api/subject/info")
def api_subject_info():
    code = request.args.get("code")
    if not code:
        return jsonify({"success": False, "message": "Code required"}), 400

    res = supabase.table("subject").select("subject_id, subject_name, subject_code").eq("subject_code", code).execute()
    if res.data:
        return jsonify({"success": True, "subject": res.data[0]})
    return jsonify({"success": False, "message": "Subject not found"}), 404


# ==========================================
# TEACHER API ENDPOINTS
# ==========================================

@app.route("/api/teacher/login", methods=["POST"])
def api_teacher_login():
    data = request.get_json(silent=True) or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"success": False, "message": "Username and password required"}), 400

    teacher = teacher_login(username, password)
    if teacher:
        session["user_role"] = "teacher"
        session["teacher_data"] = teacher
        return jsonify({
            "success": True,
            "message": "Welcome back!",
            "redirect": url_for("teacher_dashboard")
        })

    return jsonify({"success": False, "message": "Invalid username or password"}), 401


@app.route("/api/teacher/register", methods=["POST"])
def api_teacher_register():
    data = request.get_json(silent=True) or {}
    username = data.get("username", "").strip()
    name = data.get("name", "").strip()
    password = data.get("password", "")
    confirm_password = data.get("confirm_password", "")

    if not username or not name or not password:
        return jsonify({"success": False, "message": "All fields are required"}), 400

    if password != confirm_password:
        return jsonify({"success": False, "message": "Passwords do not match"}), 400

    if check_teacher_exists(username):
        return jsonify({"success": False, "message": "Username already taken"}), 409

    try:
        create_teacher(username, password, name)
        return jsonify({"success": True, "message": "Teacher account created successfully! Please log in."})
    except Exception as e:
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500


@app.route("/api/teacher/create_subject", methods=["POST"])
def api_teacher_create_subject():
    if session.get("user_role") != "teacher" or not session.get("teacher_data"):
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    teacher_id = session["teacher_data"]["teacher_id"]
    data = request.get_json(silent=True) or {}

    subject_code = data.get("subject_code", "").strip()
    subject_name = data.get("subject_name", "").strip()
    section = data.get("section", "").strip()

    if not subject_code or not subject_name or not section:
        return jsonify({"success": False, "message": "Please fill all fields"}), 400

    try:
        create_subject(subject_code, subject_name, section, teacher_id)
        return jsonify({"success": True, "message": "Subject created successfully!"})
    except Exception as e:
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500


@app.route("/api/teacher/analyze_photos", methods=["POST"])
def api_teacher_analyze_photos():
    if session.get("user_role") != "teacher" or not session.get("teacher_data"):
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    subject_id = data.get("subject_id")
    photos = data.get("photos", [])

    if not subject_id or not photos:
        return jsonify({"success": False, "message": "Subject ID and classroom photos are required"}), 400

    all_detected_ids = {}

    for idx, photo_data in enumerate(photos):
        img_np = parse_image_to_numpy(photo_data)
        if img_np is not None:
            detected, _, _ = predict_attendance(img_np)
            if detected:
                for sid in detected.keys():
                    student_id = int(sid)
                    all_detected_ids.setdefault(student_id, []).append(f"Photo {idx+1}")

    enrolled_res = supabase.table("subject_students").select("*, student(*)").eq("subject_id", subject_id).execute()
    enrolled_students = enrolled_res.data

    if not enrolled_students:
        return jsonify({"success": False, "message": "No students are currently enrolled in this subject"}), 404

    results = []
    attendance_to_log = []
    current_timestamp = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")

    for node in enrolled_students:
        student = node.get("student") or {}
        sid = int(student.get("student_id", 0))
        sources = all_detected_ids.get(sid, [])
        is_present = len(sources) > 0

        results.append({
            "Name": student.get("name", "Unknown"),
            "ID": sid,
            "Source": ", ".join(sources) if is_present else "-",
            "Status": "✅ Present" if is_present else "❌ Absent"
        })

        attendance_to_log.append({
            "student_id": sid,
            "subject_id": subject_id,
            "timestamp": current_timestamp,
            "is_present": bool(is_present)
        })

    return jsonify({
        "success": True,
        "results": results,
        "logs": attendance_to_log
    })


@app.route("/api/teacher/analyze_voice", methods=["POST"])
def api_teacher_analyze_voice():
    if session.get("user_role") != "teacher" or not session.get("teacher_data"):
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    subject_id = request.form.get("subject_id")
    audio_file = request.files.get("audio_file")

    if not subject_id or not audio_file:
        return jsonify({"success": False, "message": "Subject ID and audio file required"}), 400

    enrolled_res = supabase.table("subject_students").select("*, student(*)").eq("subject_id", subject_id).execute()
    enrolled_students = enrolled_res.data

    if not enrolled_students:
        return jsonify({"success": False, "message": "No students enrolled in this course"}), 404

    candidates_dict = {
        s["student"]["student_id"]: s["student"]["voice_embedding"]
        for s in enrolled_students if s.get("student") and s["student"].get("voice_embedding")
    }

    if not candidates_dict:
        return jsonify({"success": False, "message": "No enrolled students have voice profiles registered"}), 400

    audio_bytes = audio_file.read()
    detected_scores = process_bulk_audio(audio_bytes, candidates_dict)

    results = []
    attendance_to_log = []
    current_timestamp = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")

    for node in enrolled_students:
        student = node.get("student") or {}
        sid = student.get("student_id")
        score = detected_scores.get(sid, 0.0)
        is_present = bool(score > 0)

        results.append({
            "Name": student.get("name", "Unknown"),
            "ID": sid,
            "Source": f"Score: {score:.2f}" if is_present else "-",
            "Status": "✅ Present" if is_present else "❌ Absent"
        })

        attendance_to_log.append({
            "student_id": sid,
            "subject_id": subject_id,
            "timestamp": current_timestamp,
            "is_present": bool(is_present)
        })

    return jsonify({
        "success": True,
        "results": results,
        "logs": attendance_to_log
    })


@app.route("/api/teacher/save_attendance", methods=["POST"])
def api_teacher_save_attendance():
    if session.get("user_role") != "teacher" or not session.get("teacher_data"):
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    logs = data.get("logs", [])

    if not logs:
        return jsonify({"success": False, "message": "No logs provided"}), 400

    try:
        create_attendance(logs)
        return jsonify({"success": True, "message": "Attendance saved successfully!"})
    except Exception as e:
        return jsonify({"success": False, "message": f"Database sync failed: {str(e)}"}), 500


@app.route("/api/teacher/qr/<subject_code>")
def api_teacher_qr(subject_code):
    join_url = f"{request.host_url}?join-code={subject_code}"
    qr = segno.make(join_url)
    out = io.BytesIO()
    qr.save(out, kind="png", scale=10, border=1)
    out.seek(0)
    return send_file(out, mimetype="image/png")


# ==========================================
# APP ENTRYPOINT
# ==========================================

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print("=" * 60, flush=True)
    print(f" SnapClass AI Web Server (HTML/CSS) is running!", flush=True)
    print(f" URL: http://127.0.0.1:{port}", flush=True)
    print(" (Press CTRL+C in terminal to stop)", flush=True)
    print("=" * 60, flush=True)
    app.run(host="127.0.0.1", port=port, debug=False)
