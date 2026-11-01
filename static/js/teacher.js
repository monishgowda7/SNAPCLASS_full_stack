// Teacher Dashboard & Auth JavaScript

let teacherAttendancePhotos = [];
let voiceAudioChunks = [];
let voiceMediaRecorder = null;
let voiceAudioBlob = null;
let currentAttendanceLogs = [];

// Teacher Auth (Login & Register)
async function handleTeacherLogin(e) {
    if (e) e.preventDefault();

    const usernameInput = document.getElementById('teacherUsername');
    const passwordInput = document.getElementById('teacherPassword');
    const submitBtn = document.getElementById('btnTeacherLogin');

    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    if (!username || !password) {
        showToast('Please enter both username and password.', 'warning');
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Signing in...';
    }

    try {
        const res = await fetch('/api/teacher/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (data.success) {
            showToast('Welcome back!', 'success');
            setTimeout(() => {
                window.location.href = data.redirect || '/teacher/dashboard';
            }, 800);
        } else {
            showToast(data.message || 'Invalid username or password.', 'error');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Login';
            }
        }
    } catch (err) {
        console.error(err);
        showToast('Server communication error.', 'error');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Login';
        }
    }
}

async function handleTeacherRegister(e) {
    if (e) e.preventDefault();

    const username = document.getElementById('regTeacherUsername').value.trim();
    const name = document.getElementById('regTeacherName').value.trim();
    const password = document.getElementById('regTeacherPassword').value;
    const confirmPassword = document.getElementById('regTeacherConfirmPassword').value;
    const submitBtn = document.getElementById('btnTeacherRegister');

    if (!username || !name || !password) {
        showToast('All fields are required!', 'warning');
        return;
    }

    if (password !== confirmPassword) {
        showToast("Passwords don't match!", 'warning');
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Registering...';
    }

    try {
        const res = await fetch('/api/teacher/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, name, password, confirm_password: confirmPassword })
        });
        const data = await res.json();

        if (data.success) {
            showToast(data.message, 'success');
            // Switch to login tab
            setTimeout(() => {
                switchTeacherTab('login');
                if (document.getElementById('teacherUsername')) {
                    document.getElementById('teacherUsername').value = username;
                }
            }, 1000);
        } else {
            showToast(data.message || 'Registration failed.', 'error');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Register now';
            }
        }
    } catch (err) {
        console.error(err);
        showToast('Error registering profile.', 'error');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Register now';
        }
    }
}

function switchTeacherTab(tab) {
    const loginForm = document.getElementById('teacherLoginForm');
    const registerForm = document.getElementById('teacherRegisterForm');
    const tabLoginBtn = document.getElementById('tabTeacherLogin');
    const tabRegBtn = document.getElementById('tabTeacherReg');

    if (tab === 'login') {
        if (loginForm) loginForm.style.display = 'block';
        if (registerForm) registerForm.style.display = 'none';
        if (tabLoginBtn) tabLoginBtn.classList.add('active');
        if (tabRegBtn) tabRegBtn.classList.remove('active');
    } else {
        if (loginForm) loginForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'block';
        if (tabLoginBtn) tabLoginBtn.classList.remove('active');
        if (tabRegBtn) tabRegBtn.classList.add('active');
    }
}

// Teacher Dashboard View Navigation
function showDashboardView(viewId) {
    document.querySelectorAll('.teacher-view-pane').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.teacher-nav-tab').forEach(btn => btn.classList.remove('active'));

    const activePane = document.getElementById(viewId);
    if (activePane) activePane.style.display = 'block';

    const activeBtn = document.getElementById(`tabBtn_${viewId}`);
    if (activeBtn) activeBtn.classList.add('active');
}

// Classroom Photo Management
function openAddPhotosModal() {
    openModal('addPhotosModal');
    initWebcam('modalClassroomCamera');
}

function captureClassroomPhoto() {
    const base64 = captureFrame('modalClassroomCamera');
    if (base64) {
        teacherAttendancePhotos.push(base64);
        renderPhotoGallery();
        showToast('Photo captured!', 'success');
    } else {
        showToast('Could not capture photo from webcam.', 'warning');
    }
}

function handleClassroomPhotoUpload(input) {
    if (!input.files || !input.files.length) return;

    Array.from(input.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = e => {
            teacherAttendancePhotos.push(e.target.result);
            renderPhotoGallery();
        };
        reader.readAsDataURL(file);
    });
    showToast(`${input.files.length} photo(s) added!`, 'success');
}

function removeClassroomPhoto(idx) {
    teacherAttendancePhotos.splice(idx, 1);
    renderPhotoGallery();
}

function clearAllClassroomPhotos() {
    teacherAttendancePhotos = [];
    renderPhotoGallery();
    showToast('All photos cleared.', 'info');
}

function renderPhotoGallery() {
    const gallery = document.getElementById('classroomPhotoGallery');
    const countBadge = document.getElementById('photoCountBadge');
    const runAnalysisBtn = document.getElementById('btnRunFaceAnalysis');
    const clearBtn = document.getElementById('btnClearPhotos');

    if (!gallery) return;

    gallery.innerHTML = '';
    const count = teacherAttendancePhotos.length;
    if (countBadge) countBadge.innerText = count ? `(${count})` : '';
    if (runAnalysisBtn) runAnalysisBtn.disabled = count === 0;
    if (clearBtn) clearBtn.disabled = count === 0;

    teacherAttendancePhotos.forEach((src, idx) => {
        const div = document.createElement('div');
        div.className = 'photo-thumb';
        div.innerHTML = `
            <img src="${src}" alt="Classroom Photo ${idx + 1}" />
            <button type="button" class="btn-remove-photo" onclick="removeClassroomPhoto(${idx})" title="Remove photo">✕</button>
        `;
        gallery.appendChild(div);
    });
}

// Run Face Analysis
async function runFaceAnalysis() {
    const subjectSelect = document.getElementById('attendanceSubjectSelect');
    const subjectId = subjectSelect ? subjectSelect.value : null;

    if (!subjectId) {
        showToast('Please select a subject first.', 'warning');
        return;
    }

    if (!teacherAttendancePhotos.length) {
        showToast('Please add at least one classroom photo.', 'warning');
        return;
    }

    const btn = document.getElementById('btnRunFaceAnalysis');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Deep scanning classroom photos...';
    }

    try {
        const res = await fetch('/api/teacher/analyze_photos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subject_id: subjectId,
                photos: teacherAttendancePhotos
            })
        });
        const data = await res.json();

        if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'Run Face Analysis';
        }

        if (data.success) {
            currentAttendanceLogs = data.logs;
            renderAttendanceResultsTable(data.results);
            openModal('attendanceResultModal');
        } else {
            showToast(data.message || 'Face analysis failed.', 'error');
        }
    } catch (err) {
        console.error(err);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'Run Face Analysis';
        }
        showToast('Server error while analyzing photos.', 'error');
    }
}

// Render Attendance Results
function renderAttendanceResultsTable(results) {
    const tbody = document.getElementById('attendanceResultTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    results.forEach((r, idx) => {
        const tr = document.createElement('tr');
        const isPresent = r.Status.includes('Present');

        tr.innerHTML = `
            <td><strong>${r.Name}</strong></td>
            <td><code>${r.ID}</code></td>
            <td>${r.Source || '-'}</td>
            <td>
                <span class="status-badge ${isPresent ? 'present' : 'absent'}" id="statusBadge_${idx}">
                    ${isPresent ? '✅ Present' : '❌ Absent'}
                </span>
            </td>
            <td>
                <button type="button" class="btn btn-sm btn-outline" onclick="toggleAttendanceItem(${idx})">Toggle</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function toggleAttendanceItem(idx) {
    if (!currentAttendanceLogs[idx]) return;

    currentAttendanceLogs[idx].is_present = !currentAttendanceLogs[idx].is_present;
    const isPresent = currentAttendanceLogs[idx].is_present;

    const badge = document.getElementById(`statusBadge_${idx}`);
    if (badge) {
        badge.className = `status-badge ${isPresent ? 'present' : 'absent'}`;
        badge.innerHTML = isPresent ? '✅ Present' : '❌ Absent';
    }
}

// Confirm and Save Attendance
async function confirmAndSaveAttendance() {
    if (!currentAttendanceLogs.length) {
        showToast('No attendance logs to save.', 'warning');
        return;
    }

    const saveBtn = document.getElementById('btnConfirmSaveAttendance');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner"></span> Saving...';
    }

    try {
        const res = await fetch('/api/teacher/save_attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ logs: currentAttendanceLogs })
        });
        const data = await res.json();

        if (data.success) {
            showToast('Attendance recorded and synced successfully!', 'success');
            clearAllClassroomPhotos();
            closeModal('attendanceResultModal');
            setTimeout(() => window.location.reload(), 1200);
        } else {
            showToast(data.message || 'Failed to save attendance.', 'error');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = 'Confirm & Save';
            }
        }
    } catch (err) {
        console.error(err);
        showToast('Error syncing attendance.', 'error');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Confirm & Save';
        }
    }
}

// Voice Attendance
function openVoiceAttendanceModal() {
    const subjectSelect = document.getElementById('attendanceSubjectSelect');
    const subjectId = subjectSelect ? subjectSelect.value : null;

    if (!subjectId) {
        showToast('Please select a subject first.', 'warning');
        return;
    }
    openModal('voiceAttendanceModal');
}

async function toggleVoiceRecording() {
    const btn = document.getElementById('btnRecordClassVoice');
    const statusText = document.getElementById('classVoiceStatus');
    const audioPreview = document.getElementById('classVoicePreview');

    if (!voiceMediaRecorder || voiceMediaRecorder.state === 'inactive') {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            voiceAudioChunks = [];
            voiceMediaRecorder = new MediaRecorder(stream);

            voiceMediaRecorder.ondataavailable = e => {
                if (e.data.size > 0) voiceAudioChunks.push(e.data);
            };

            voiceMediaRecorder.onstop = () => {
                voiceAudioBlob = new Blob(voiceAudioChunks, { type: 'audio/wav' });
                if (audioPreview) {
                    audioPreview.src = URL.createObjectURL(voiceAudioBlob);
                    audioPreview.style.display = 'block';
                }
                stream.getTracks().forEach(t => t.stop());
            };

            voiceMediaRecorder.start();
            if (btn) {
                btn.classList.add('recording');
                btn.innerHTML = '⏹️';
            }
            if (statusText) statusText.innerText = 'Recording classroom audio...';
        } catch (err) {
            console.error(err);
            showToast('Microphone access denied.', 'error');
        }
    } else if (voiceMediaRecorder.state === 'recording') {
        voiceMediaRecorder.stop();
        if (btn) {
            btn.classList.remove('recording');
            btn.innerHTML = '🎤';
        }
        if (statusText) statusText.innerText = 'Classroom audio recorded!';
        showToast('Classroom audio recorded!', 'success');
    }
}

async function runVoiceAnalysis() {
    const subjectSelect = document.getElementById('attendanceSubjectSelect');
    const subjectId = subjectSelect ? subjectSelect.value : null;
    const fileInput = document.getElementById('classVoiceFileInput');

    let audioToSend = null;

    if (fileInput && fileInput.files && fileInput.files[0]) {
        audioToSend = fileInput.files[0];
    } else if (voiceAudioBlob) {
        audioToSend = voiceAudioBlob;
    }

    if (!audioToSend) {
        showToast('Please record audio or upload an audio file.', 'warning');
        return;
    }

    const analyzeBtn = document.getElementById('btnAnalyzeClassVoice');
    if (analyzeBtn) {
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<span class="spinner"></span> Processing voice embeddings...';
    }

    const formData = new FormData();
    formData.append('subject_id', subjectId);
    formData.append('audio_file', audioToSend, 'classroom_audio.wav');

    try {
        const res = await fetch('/api/teacher/analyze_voice', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();

        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = 'Analyze Audio';
        }

        if (data.success) {
            closeModal('voiceAttendanceModal');
            currentAttendanceLogs = data.logs;
            renderAttendanceResultsTable(data.results);
            openModal('attendanceResultModal');
        } else {
            showToast(data.message || 'Voice analysis failed.', 'error');
        }
    } catch (err) {
        console.error(err);
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = 'Analyze Audio';
        }
        showToast('Server error during voice analysis.', 'error');
    }
}

// Subject Management: Create Subject
async function createNewSubject(e) {
    if (e) e.preventDefault();

    const code = document.getElementById('newSubjectCode').value.trim();
    const name = document.getElementById('newSubjectName').value.trim();
    const section = document.getElementById('newSubjectSection').value.trim();
    const submitBtn = document.getElementById('btnCreateSubjectSubmit');

    if (!code || !name || !section) {
        showToast('Please fill all the fields.', 'warning');
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Creating subject...';
    }

    try {
        const res = await fetch('/api/teacher/create_subject', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subject_code: code,
                subject_name: name,
                section: section
            })
        });
        const data = await res.json();

        if (data.success) {
            showToast('Subject created successfully!', 'success');
            closeModal('createSubjectModal');
            setTimeout(() => window.location.reload(), 900);
        } else {
            showToast(data.message || 'Failed to create subject.', 'error');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Create Subject Now';
            }
        }
    } catch (err) {
        console.error(err);
        showToast('Error creating subject.', 'error');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Create Subject Now';
        }
    }
}

// Share Subject: QR & Link
function openShareSubjectModal(name, code) {
    const nameEl = document.getElementById('shareSubjectName');
    const codeEl = document.getElementById('shareSubjectCode');
    const linkEl = document.getElementById('shareSubjectLink');
    const qrImg = document.getElementById('shareSubjectQR');

    const joinUrl = `${window.location.origin}/?join-code=${encodeURIComponent(code)}`;

    if (nameEl) nameEl.innerText = name;
    if (codeEl) codeEl.innerText = code;
    if (linkEl) linkEl.value = joinUrl;
    if (qrImg) qrImg.src = `/api/teacher/qr/${encodeURIComponent(code)}?t=${Date.now()}`;

    openModal('shareSubjectModal');
}

function copyShareLink() {
    const linkEl = document.getElementById('shareSubjectLink');
    if (linkEl) {
        linkEl.select();
        navigator.clipboard.writeText(linkEl.value).then(() => {
            showToast('Link copied to clipboard!', 'success');
        }).catch(() => {
            document.execCommand('copy');
            showToast('Link copied!', 'success');
        });
    }
}
