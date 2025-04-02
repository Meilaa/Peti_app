# PowerShell script to check Node.js installation
Write-Host "===== Node.js Installation Checker =====" -ForegroundColor Green

# Check if node is in PATH
Write-Host "Checking for Node.js in PATH..." -ForegroundColor Yellow
$nodeExists = $null -ne (Get-Command node -ErrorAction SilentlyContinue)

if ($nodeExists) {
    $nodeVersion = node -v
    Write-Host "✅ Node.js is installed: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js is NOT installed or not in PATH" -ForegroundColor Red
    Write-Host "Please download and install Node.js from https://nodejs.org/" -ForegroundColor Red
    Write-Host "Make sure to check 'Add to PATH' during installation" -ForegroundColor Red
}

# Check if npm is in PATH
Write-Host "`nChecking for npm in PATH..." -ForegroundColor Yellow
$npmExists = $null -ne (Get-Command npm -ErrorAction SilentlyContinue)

if ($npmExists) {
    $npmVersion = npm -v
    Write-Host "✅ npm is installed: $npmVersion" -ForegroundColor Green
} else {
    Write-Host "❌ npm is NOT installed or not in PATH" -ForegroundColor Red
    Write-Host "npm should be installed with Node.js" -ForegroundColor Red
}

# Check directory structure
Write-Host "`nChecking directory structure..." -ForegroundColor Yellow
$currentDir = Get-Location
Write-Host "Current directory: $currentDir" -ForegroundColor Cyan

# Try to navigate to Backend directory
Write-Host "`nAttempting to find Backend directory..." -ForegroundColor Yellow
$backendPath = "$currentDir\Backend"
$frontendPath = "$currentDir\Fronted"

if (Test-Path $backendPath) {
    Write-Host "✅ Backend directory found at: $backendPath" -ForegroundColor Green
    
    # Check for backend codebase
    $backendMainPath = "$backendPath\MyBachelor_Backend-main"
    if (Test-Path $backendMainPath) {
        Write-Host "✅ Backend codebase found at: $backendMainPath" -ForegroundColor Green
        
        # Check for index.js
        $indexPath = "$backendMainPath\index.js"
        if (Test-Path $indexPath) {
            Write-Host "✅ Backend index.js file found" -ForegroundColor Green
        } else {
            Write-Host "❌ Backend index.js file NOT found" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Backend codebase NOT found at: $backendMainPath" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Backend directory NOT found at: $backendPath" -ForegroundColor Red
    Write-Host "Are you in the correct parent directory?" -ForegroundColor Red
}

# Check frontend directory
if (Test-Path $frontendPath) {
    Write-Host "✅ Frontend directory found at: $frontendPath" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend directory NOT found at: $frontendPath" -ForegroundColor Red
}

# Display required commands
Write-Host "`n===== COMMANDS TO RUN =====" -ForegroundColor Green
Write-Host "After installing Node.js, run these commands:" -ForegroundColor Cyan
Write-Host "1. Start the backend:" -ForegroundColor Yellow
Write-Host "   cd $backendMainPath" -ForegroundColor White
Write-Host "   node index.js" -ForegroundColor White

Write-Host "`n2. In a new PowerShell window, start the frontend:" -ForegroundColor Yellow
Write-Host "   cd $frontendPath\MyBachelor-testing" -ForegroundColor White
Write-Host "   npm start" -ForegroundColor White

Write-Host "`nMake sure to install Node.js before running these commands!" -ForegroundColor Red 