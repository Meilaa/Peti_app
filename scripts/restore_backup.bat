@echo off
echo Starting complete restoration from backups...

echo Clearing current frontend directory...
rmdir /S /Q "C:\Users\Arculus\Desktop\Bacheolor\Fronted\MyBachelor-testing"

echo Clearing current backend directory...
rmdir /S /Q "C:\Users\Arculus\Desktop\Bacheolor\Backend\MyBachelor_Backend-main"

echo Copying frontend from backup...
xcopy /E /I /Y "C:\Users\Arculus\Desktop\Bacheolor\Backup\MyBachelor-testing\MyBachelor-testing" "C:\Users\Arculus\Desktop\Bacheolor\Fronted\MyBachelor-testing"

echo Copying backend from backup...
xcopy /E /I /Y "C:\Users\Arculus\Desktop\Bacheolor\Backup\MyBachelor_Backend-main" "C:\Users\Arculus\Desktop\Bacheolor\Backend\MyBachelor_Backend-main"

echo Restoration complete!
echo Your project has been completely restored from backups.
echo.
echo Press any key to exit...
pause >nul 