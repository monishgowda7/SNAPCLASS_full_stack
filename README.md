<<<<<<< HEAD
# SnapClass - Making Attendance Faster using AI 📸✨

SnapClass is an intelligent AI-powered attendance management web application designed for students and teachers. It features Face Recognition (dlib + SVM) and Voice Recognition (Resemblyzer) with a modern HTML & CSS frontend powered by a Flask backend integrated with Supabase.

---

## 🚀 Key Features

### 🎓 Student Portal
- **FaceID Login**: Real-time webcam face scanning with instant facial verification using dlib & SVM classification.
- **Student Profile Registration**: Register with facial feature embeddings and optional voice utterance enrollment (`MediaRecorder` API).
- **Subject Enrollment**:
  - Enter course subject code (e.g., `CS101`) to enroll.
  - Direct QR Code scan & Auto-enrollment URL support (`?join-code=CS101`).
- **Student Dashboard**: View enrolled courses, total lectures held, lectures attended, and overall attendance percentage, with option to unenroll.

### 👨‍🏫 Teacher Portal
- **Authentication**: Secure password hashing with bcrypt, supporting teacher login and profile registration.
- **Take AI Attendance**:
  - Capture multiple classroom photos via live webcam snapshot or file upload.
  - Photo gallery with clear and preview capabilities.
  - **Run Face Analysis**: Deep scans all classroom photos and automatically matches faces against enrolled students.
  - **Voice Attendance**: Record or upload classroom audio to identify students who responded vocally.
  - **Review & Confirm**: Real-time review table showing Student Name, ID, Source photo/score, and Present/Absent status with manual toggle option before committing to database.
- **Manage Subjects**:
  - Create new courses (Code, Name, Section).
  - Subject cards with total enrolled students and class sessions held.
  - One-click QR code generator (using `segno`) and copyable direct invite link for easy student enrollment.
- **Attendance Records**:
  - View full attendance history grouped by class session timestamp with counts of present vs total students.

---

## 🎨 Frontend Architecture (HTML & CSS)

- **Semantic HTML5 Templates** in `templates/`:
  - `templates/base.html`: Common layout, branding, fonts, toast alerts, modal system.
  - `templates/index.html`: Home portal with Student and Teacher mascot cards.
  - `templates/student_login.html`: FaceID webcam scanner & new student profile registration.
  - `templates/student_dashboard.html`: Subject cards, attendance statistics, enroll & unenroll modals.
  - `templates/teacher_auth.html`: Teacher sign in and registration tabs.
  - `templates/teacher_dashboard.html`: Take AI Attendance, Manage Subjects, and Attendance Records views.
- **Custom CSS** in `static/css/style.css`:
  - Discord Blurple (`#5865F2`), Accent Pink (`#EB459E`), and Periwinkle (`#E0E3FF`) color scheme.
  - Custom typography with Google Fonts: `'Climate Crisis'` for impactful headings & `'Outfit'` for body text.
  - Smooth card animations, pulsing face scan overlay, audio visualizer, responsive grids, and toast notifications.
- **Client-Side Scripts** in `static/js/`:
  - `static/js/main.js`: Modal dialog controllers and toast alert framework.
  - `static/js/student.js`: Webcam video stream handling, snapshot capture, voice recorder, enrollment handlers.
  - `static/js/teacher.js`: Classroom photo collection, face analysis runner, voice attendance handler, QR modal.

---

## ⚙️ Backend Architecture (Preserved Intact)

All original backend logic remains fully intact:
- **`src/database/config.py`**: Supabase client connection (auto-loading from `.streamlit/secrets.toml` or environment variables).
- **`src/database/db.py`**: Database CRUD operations for teachers, students, subjects, and attendance logs.
- **`src/pipeline/face_pipeline.py`**: dlib 68-point face shape predictor, 128D face descriptor extractor, and scikit-learn SVC classifier.
- **`src/pipeline/voice_pipeline.py`**: Resemblyzer voice encoder, voice utterance embedding, and speaker identification.

---

## 📦 How to Run

### 1. Activate the Virtual Environment
```powershell
.\virtual\Scripts\activate
```

### 2. Start the SnapClass Web Application (HTML/CSS + Flask)
```powershell
python app.py
```
Open your browser and navigate to:
```
http://127.0.0.1:5000
```

*(Note: The legacy Streamlit interface is preserved in `app_streamlit.py` and can be launched via `streamlit run app_streamlit.py` if desired).*
=======
📸 SnapClass AI — Smart Attendance System

AI-Powered Classroom Attendance Made Simple

SnapClass AI is an intelligent attendance management system designed to make classroom attendance faster, smarter, and more efficient. By leveraging Artificial Intelligence, Deep Learning, and Computer Vision, SnapClass helps automate student identification and attendance marking, reducing manual effort for teachers and saving valuable classroom time.

[🚀 **Live Demo – Open Snap Class AI**](https://snapclass-ai-monish.streamlit.app/)

⸻

✨ Key Features

* 👨‍🏫 Separate Teacher and Student Portals — Dedicated interfaces for teachers and students.
* 🧑‍🎓 Student Registration — Students can register under their respective teachers.
* 🔐 Face ID Registration — Students can register their facial information for AI-based identification.
* 📚 Subject-Based Enrollment — Students can join the appropriate subject using a unique subject code.
* 📸 AI-Powered Attendance — Teachers can capture or provide classroom photographs for automated student identification.
* 🤖 Computer Vision — AI analyzes classroom images to recognize enrolled students.
* ⚡ Automated Attendance Management — Reduces the need for manual roll calls and repetitive data entry.
* 🌐 Web-Based Application — Access the application through a browser.

🎯 Problem Statement

Traditional classroom attendance methods are time-consuming, require manual effort, and can be prone to human error or proxy attendance.

SnapClass AI aims to address these challenges by introducing an AI-powered solution that simplifies student identification and attendance tracking.

💡 Our Solution

SnapClass AI combines facial recognition technology with a user-friendly web interface to streamline the attendance process.

How It Works

1. Teacher Access: Teachers access their dedicated portal.
2. Student Registration: Students register under their respective teachers.
3. Subject Enrollment: Students join subjects using their unique subject codes.
4. Classroom Image Capture: Teachers capture or provide photographs of the classroom.
5. AI-Based Identification: The system analyzes the photographs and identifies recognized students.
6. Attendance Management: The system helps automate attendance marking for identified students.

🛠️ Technology Stack

Category	Technology
Programming Language	Python
Frontend / Web Interface	Streamlit
Artificial Intelligence	Machine Learning and Deep Learning
Core AI Technology	Computer Vision and Face Recognition
Application Deployment	Streamlit Community Cloud
Version Control	Git and GitHub

🚀 Getting Started

Follow these steps to run SnapClass AI locally.

Prerequisites

* Python installed on your computer
* Git installed on your computer
* A code editor such as Visual Studio Code

1. Clone the Repository

git clone https://github.com/monishgowda7/Snap-Ai.git

2. Navigate to the Project Directory

cd Snap-Ai

3. Create a Virtual Environment (Recommended)

python -m venv venv

Activate it on Windows:

venv\Scripts\activate

4. Install Dependencies

python -m pip install -r requirements.txt

5. Run the Application

python -m streamlit run app.py

Once the application starts, open the local URL displayed in your terminal, usually:http://localhost:8501

Note: The project may require additional configuration, environment variables, or system dependencies depending on the implementation.

🌟 Benefits

* Reduces time spent on manual attendance.
* Simplifies classroom attendance management.
* Uses AI to assist student identification.
* Provides separate interfaces for teachers and students.
* Demonstrates the practical application of AI and Computer Vision in education.
* Offers a foundation for future improvements in educational automation.

🔮 Future Enhancements

Potential improvements include:

* 📊 Advanced attendance analytics and visual reports.
* 📥 Attendance report export.
* 📱 Improved mobile responsiveness.
* 🔔 Notifications for attendance updates.
* 🏫 Support for multiple classes and institutions.
* 🔒 Additional privacy and security enhancements.

🔐 Privacy and Responsible Use

SnapClass AI works with facial information for student identification. Any real-world deployment should obtain appropriate consent, protect biometric information, restrict unauthorized access, and comply with applicable privacy and data-protection requirements.

👨‍💻 Author

Monish Gowda

* 🌐 Live Project: https://snapclass-ai-monish.streamlit.app/
* 💻 GitHub: https://github.com/monishgowda7/Snap-Ai

⸻

🚀 SnapClass AI

Smarter Attendance. Less Manual Work. Better Classrooms.

Bringing AI-powered automation to everyday education.

>>>>>>> 1f2d4face78b5e289c63357506cc31a8091b6c17
