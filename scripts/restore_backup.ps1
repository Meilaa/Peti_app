Write-Host "Starting complete restoration from backups..." -ForegroundColor Green

Write-Host "Clearing current frontend directory..." -ForegroundColor Yellow
if (Test-Path "C:\Users\Arculus\Desktop\Bacheolor\Fronted\MyBachelor-testing") {
    Remove-Item -Path "C:\Users\Arculus\Desktop\Bacheolor\Fronted\MyBachelor-testing" -Recurse -Force
}

Write-Host "Clearing current backend directory..." -ForegroundColor Yellow
if (Test-Path "C:\Users\Arculus\Desktop\Bacheolor\Backend\MyBachelor_Backend-main") {
    Remove-Item -Path "C:\Users\Arculus\Desktop\Bacheolor\Backend\MyBachelor_Backend-main" -Recurse -Force
}

Write-Host "Copying frontend from backup..." -ForegroundColor Yellow
Copy-Item -Path "C:\Users\Arculus\Desktop\Bacheolor\Backup\MyBachelor-testing\MyBachelor-testing" -Destination "C:\Users\Arculus\Desktop\Bacheolor\Fronted\" -Recurse -Force

Write-Host "Copying backend from backup..." -ForegroundColor Yellow
Copy-Item -Path "C:\Users\Arculus\Desktop\Bacheolor\Backup\MyBachelor_Backend-main" -Destination "C:\Users\Arculus\Desktop\Bacheolor\Backend\" -Recurse -Force

Write-Host "Restoration complete!" -ForegroundColor Green
Write-Host "Your project has been completely restored from backups." -ForegroundColor Green

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 