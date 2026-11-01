@echo off
title SnapClass AI Attendance System
echo ======================================================
echo           Starting SnapClass Web Application
echo ======================================================
cd /d "%~dp0"
call .\virtual\Scripts\activate.bat
echo Server is running at http://127.0.0.1:5000
start http://127.0.0.1:5000
python app.py
pause
