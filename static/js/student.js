// Student FaceID & Dashboard JavaScript

let videoStream = null;
let capturedFaceBase64 = null;
let audioChunks = [];
let mediaRecorder = null;
let recordedAudioBlob = null;

// Initialize Webcam
async function initWebcam(videoId = 'studentCamera') {
    const video = document.getElementById(videoId);
    if (!video) return;

    try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            videoStream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" } 
            });
            video.srcObject = videoStream;
        } else {
            showToast("Camera not supported on this browser.", "error");
        }
    } catch (err) {
        console.warn("Camera access denied or unavailable:", err);
        showToast("Camera access was denied. You can also upload a photo.", "warning");
        const uploadFallback = document.getElementById('cameraUploadFallback');
        if (uploadFallback) uploadFallback.style.display = 'block';
    }
}

// Stop Webcam
function stopWebcam() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
}

// Capture current webcam frame
function captureFrame(videoId = 'studentCamera') {
    const video = document.getElementById(videoId);
    if (!video || !video.videoWidth) {
        return null;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.95);
}

// Handle FaceID Scan / Login
async function verifyFaceId() {
    const scanBtn = document.getElementById('btnScanFace');
    const cameraBox = document.getElementById('cameraContainer');
    const photoFileInput = document.getElementById('studentPhotoFile');

    let base64Image = null;

    if (photoFileInput && photoFileInput.files && photoFileInput.files[0]) {
        // Read from file upload
        base64Image = await readFileAsBase64(photoFileInput.files[0]);
    } else {
        // Capture from live webcam
        base64Image = captureFrame('studentCamera');
    }

    if (!base64Image) {
        showToast("Please allow camera access or upload a photo of your face.", "warning");
        return;
    }

    capturedFaceBase64 = base64Image;

    // Show scanning UI
    if (cameraBox) cameraBox.classList.add('is-scanning');
    if (scanBtn) {
        scanBtn.disabled = true;
        scanBtn.innerHTML = '<span class="spinner"></span> AI is scanning face...';
    }

    try {
        const response = await fetch('/api/student/login_face', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image })
        });
        const data = await response.json();

        if (cameraBox) cameraBox.classList.remove('is-scanning');
        if (scanBtn) {
            scanBtn.disabled = false;
            scanBtn.innerHTML = 'Scan FaceID';
        }

        if (data.success) {
            showToast(`Welcome back, ${data.student.name}!`, 'success');
            stopWebcam();
            setTimeout(() => {
                window.location.href = data.redirect || '/student/dashboard';
            }, 1000);
        } else {
            showToast(data.message || 'Face not recognized.', data.not_recognized ? 'info' : 'warning');
            if (data.not_recognized) {
                // Reveal Registration Form
                const regForm = document.getElementById('studentRegForm');
                if (regForm) {
                    regForm.style.display = 'block';
                    regForm.scrollIntoView({ behavior: 'smooth' });
                }
            }
        }
    } catch (err) {
        console.error(err);
        if (cameraBox) cameraBox.classList.remove('is-scanning');
        if (scanBtn) {
            scanBtn.disabled = false;
            scanBtn.innerHTML = 'Scan FaceID';
        }
        showToast('Error communicating with server.', 'error');
    }
}

// Convert File to Base64
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

// Audio Recording for Voice Enrollment
async function toggleAudioRecording() {
    const recordBtn = document.getElementById('btnRecordAudio');
    const audioStatus = document.getElementById('audioRecordStatus');
    const audioPreview = document.getElementById('audioPreview');

    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioChunks = [];
            mediaRecorder = new MediaRecorder(stream);
            
            mediaRecorder.ondataavailable = e => {
                if (e.data.size > 0) audioChunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                recordedAudioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                if (audioPreview) {
                    audioPreview.src = URL.createObjectURL(recordedAudioBlob);
                    audioPreview.style.display = 'block';
                }
                stream.getTracks().forEach(t => t.stop());
            };

            mediaRecorder.start();
            if (recordBtn) {
                recordBtn.classList.add('recording');
                recordBtn.innerHTML = '⏹️';
            }
            if (audioStatus) audioStatus.innerText = 'Recording voice... Speak clearly (e.g. "I am present")';
        } catch (err) {
            console.error(err);
            showToast('Microphone access denied or not available.', 'error');
        }
    } else if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        if (recordBtn) {
            recordBtn.classList.remove('recording');
            recordBtn.innerHTML = '🎤';
        }
        if (audioStatus) audioStatus.innerText = 'Voice recorded successfully!';
        showToast('Voice recorded!', 'success');
    }
}

// Register New Student Profile
async function registerStudentProfile(e) {
    if (e) e.preventDefault();

    const nameInput = document.getElementById('regStudentName');
    const name = nameInput ? nameInput.value.trim() : '';
    const regSubmitBtn = document.getElementById('btnRegisterSubmit');

    if (!name) {
        showToast('Please enter your full name.', 'warning');
        return;
    }

    if (!capturedFaceBase64) {
        capturedFaceBase64 = captureFrame('studentCamera');
    }

    if (!capturedFaceBase64) {
        const photoFileInput = document.getElementById('studentPhotoFile');
        if (photoFileInput && photoFileInput.files && photoFileInput.files[0]) {
            capturedFaceBase64 = await readFileAsBase64(photoFileInput.files[0]);
        }
    }

    if (!capturedFaceBase64) {
        showToast('Face photo is required for enrollment. Please scan or upload.', 'warning');
        return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('face_image', capturedFaceBase64);

    // Audio file upload or recorded audio
    const audioFileInput = document.getElementById('regAudioFile');
    if (audioFileInput && audioFileInput.files && audioFileInput.files[0]) {
        formData.append('voice_audio', audioFileInput.files[0]);
    } else if (recordedAudioBlob) {
        formData.append('voice_audio', recordedAudioBlob, 'voice.wav');
    }

    if (regSubmitBtn) {
        regSubmitBtn.disabled = true;
        regSubmitBtn.innerHTML = '<span class="spinner"></span> Creating profile & training AI...';
    }

    try {
        const response = await fetch('/api/student/register', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (data.success) {
            showToast(data.message || 'Profile created!', 'success');
            stopWebcam();
            setTimeout(() => {
                window.location.href = data.redirect || '/student/dashboard';
            }, 1200);
        } else {
            showToast(data.message || 'Failed to create profile.', 'error');
            if (regSubmitBtn) {
                regSubmitBtn.disabled = false;
                regSubmitBtn.innerHTML = 'Create Account';
            }
        }
    } catch (err) {
        console.error(err);
        showToast('Error registering student.', 'error');
        if (regSubmitBtn) {
            regSubmitBtn.disabled = false;
            regSubmitBtn.innerHTML = 'Create Account';
        }
    }
}

// Student Subject Actions
async function enrollInSubject() {
    const codeInput = document.getElementById('enrollSubjectCode');
    const code = codeInput ? codeInput.value.trim() : '';

    if (!code) {
        showToast('Please enter a subject code.', 'warning');
        return;
    }

    try {
        const res = await fetch('/api/student/enroll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject_code: code })
        });
        const data = await res.json();

        if (data.success) {
            showToast(data.message, 'success');
            closeModal('enrollModal');
            setTimeout(() => window.location.reload(), 1000);
        } else {
            showToast(data.message, 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Failed to enroll in subject.', 'error');
    }
}

async function unenrollSubject(subjectId, subjectName) {
    if (!confirm(`Are you sure you want to unenroll from ${subjectName}?`)) {
        return;
    }

    try {
        const res = await fetch('/api/student/unenroll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject_id: subjectId })
        });
        const data = await res.json();

        if (data.success) {
            showToast(data.message, 'success');
            setTimeout(() => window.location.reload(), 800);
        } else {
            showToast(data.message, 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Error unenrolling from course.', 'error');
    }
}

// Quick auto-enroll from join-code query param
async function handleAutoEnrollCode(code) {
    if (!code) return;
    try {
        const res = await fetch(`/api/subject/info?code=${encodeURIComponent(code)}`);
        const data = await res.json();
        if (data.success && data.subject) {
            const modalMsg = document.getElementById('autoEnrollMsg');
            if (modalMsg) {
                modalMsg.innerHTML = `Would you like to enroll in <b>${data.subject.subject_name}</b> (${data.subject.subject_code})?`;
            }
            const confirmBtn = document.getElementById('btnConfirmAutoEnroll');
            if (confirmBtn) {
                confirmBtn.onclick = () => {
                    document.getElementById('enrollSubjectCode').value = code;
                    enrollInSubject();
                    closeModal('autoEnrollModal');
                };
            }
            openModal('autoEnrollModal');
        }
    } catch (e) {
        console.error(e);
    }
}
