@echo off
REM Launch MozillaBuild and compile Vesper from the spaceless overlay path.
cd /d C:\vesper\desktop
C:\mozilla-build\start-shell.bat -c "cd /c/vesper/desktop && npm run build"
