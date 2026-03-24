@echo off
cd /d "%~dp0.."
start /b node scripts\warmup.mjs
npm.cmd run dev
