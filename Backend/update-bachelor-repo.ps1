# This script updates the 'bachelor' repository with changes from local Backend and Fronted directories.
# It ensures no duplication, improves repository structure, excludes node_modules, and disconnects GitHub credentials after pushing.

# Configuration
$repoUrl = "https://github.com/arculusdev/bachelor.git"      # Repository URL
$localRepoPath = "C:\Users\Arculus\Desktop\BachelorRepo"     # Local path for the repository clone
$backendPath = "C:\Users\Arculus\Desktop\Bacheolor\Backend"  # Local Backend directory
$frontendPath = "C:\Users\Arculus\Desktop\Bacheolor\Fronted" # Local Frontend directory
$branchName = "main"                                         # Branch to work on (change if necessary)

# Function to handle errors and exit
function Handle-Error {
    param ($message)
    Write-Host "Error: $message" -ForegroundColor Red
    exit 1
}

# Instructions for the user
Write-Host "Instructions:" -ForegroundColor Green
Write-Host "1. Ensure Git is installed on your system."
Write-Host "2. Verify the configuration paths match your local setup."
Write-Host "3. Run the script and log in to GitHub when prompted (credentials will be cleared afterward)."
Write-Host "Starting repository update process for $repoUrl..." -ForegroundColor Green

# Ensure Git is installed
if (-Not (Get-Command git -ErrorAction SilentlyContinue)) {
    Handle-Error "Git is not installed. Please install Git first."
}

# Confirm with the user before proceeding
Write-Host "Backend path: $backendPath" -ForegroundColor Yellow
Write-Host "Frontend path: $frontendPath" -ForegroundColor Yellow
$confirmation = Read-Host "Are you sure you want to update and restructure $localRepoPath with changes from these directories? (yes/y)"
if ($confirmation -ne "yes" -and $confirmation -ne "y") {
    Write-Host "Operation cancelled." -ForegroundColor Yellow
    exit
}

# Step 1: Clone the repository if it doesn't exist
if (-Not (Test-Path $localRepoPath)) {
    Write-Host "Cloning repository from $repoUrl to $localRepoPath..." -ForegroundColor Cyan
    try {
        git clone $repoUrl $localRepoPath
    } catch {
        Handle-Error "Failed to clone repository. Check network, permissions, or URL."
    }
}
Set-Location $localRepoPath

# Step 2: Ensure the correct branch is checked out
try {
    $currentBranch = git rev-parse --abbrev-ref HEAD
    if ($currentBranch -ne $branchName) {
        Write-Host "Switching to $branchName branch..." -ForegroundColor Cyan
        git checkout $branchName
    }
} catch {
    Handle-Error "Failed to checkout $branchName branch. It may not exist."
}

# Step 3: Pull the latest changes from the remote repository
Write-Host "Pulling latest changes from $branchName..." -ForegroundColor Cyan
try {
    git fetch origin
    git reset --hard origin/$branchName
} catch {
    Handle-Error "Failed to sync with remote repository. Check network or repository state."
}

# Step 4: Create or update .gitignore to exclude unnecessary files
$gitignorePath = Join-Path $localRepoPath ".gitignore"
$gitignoreContent = @"
# Ignore node_modules and common build artifacts
node_modules/
.env
dist/
build/
*.log
"@

if (-Not (Test-Path $gitignorePath)) {
    Write-Host "Creating .gitignore file..." -ForegroundColor Cyan
    $gitignoreContent | Out-File -Encoding utf8 $gitignorePath
    git add $gitignorePath
    git commit -m "Added .gitignore to exclude node_modules and other artifacts"
} else {
    $existingGitignore = Get-Content -Path $gitignorePath -Raw
    if ($existingGitignore -notmatch "node_modules/") {
        Write-Host "Updating .gitignore to include node_modules exclusion..." -ForegroundColor Cyan
        $existingGitignore + "`n" + $gitignoreContent | Out-File -Encoding utf8 $gitignorePath
        git add $gitignorePath
        git commit -m "Updated .gitignore to exclude node_modules"
    }
}

# Step 5: Restructure the repository
Write-Host "Restructuring repository..." -ForegroundColor Cyan

# Define directories for organization
$docsDir = Join-Path $localRepoPath "docs"
$scriptsDir = Join-Path $localRepoPath "scripts"
$frontendDir = Join-Path $localRepoPath "Frontend"
$backendDir = Join-Path $localRepoPath "Backend"

# Create directories if they don't exist
if (-Not (Test-Path $docsDir)) { New-Item -Path $docsDir -ItemType Directory -Force | Out-Null }
if (-Not (Test-Path $scriptsDir)) { New-Item -Path $scriptsDir -ItemType Directory -Force | Out-Null }
if (-Not (Test-Path $frontendDir)) { New-Item -Path $frontendDir -ItemType Directory -Force | Out-Null }
if (-Not (Test-Path $backendDir)) { New-Item -Path $backendDir -ItemType Directory -Force | Out-Null }

# Move documentation files to docs/
$docFiles = @("README.md", "CHANGELOG.md", "CONTRIBUTING.md", "restore_instruction.txt")
foreach ($file in $docFiles) {
    $source = Join-Path $localRepoPath $file
    if (Test-Path $source) {
        $dest = Join-Path $docsDir $file
        Move-Item -Path $source -Destination $dest -Force
        Write-Host "Moved $file to docs/" -ForegroundColor Yellow
        git add $source
        git add $dest
    }
}

# Move script files to scripts/
$scriptFiles = @("check_node.ps1", "restore_backup.bat", "restore_backup.ps1", "update_bachelor_repo.ps1")
foreach ($file in $scriptFiles) {
    $source = Join-Path $localRepoPath $file
    if (Test-Path $source) {
        $dest = Join-Path $scriptsDir $file
        Move-Item -Path $source -Destination $dest -Force
        Write-Host "Moved $file to scripts/" -ForegroundColor Yellow
        git add $source
        git add $dest
    }
}

# Rename Fronted/MyBachelor-testing to Frontend/MyBachelor
$oldFrontendPath = Join-Path $localRepoPath "Fronted/MyBachelor-testing"
$newFrontendPath = Join-Path $frontendDir "MyBachelor"
if (Test-Path $oldFrontendPath) {
    Move-Item -Path $oldFrontendPath -Destination $newFrontendPath -Force
    Write-Host "Renamed Fronted/MyBachelor-testing to Frontend/MyBachelor" -ForegroundColor Yellow
    git add $oldFrontendPath
    git add $newFrontendPath
}

# Remove the old Fronted directory if empty
$oldFrontedDir = Join-Path $localRepoPath "Fronted"
if (Test-Path $oldFrontedDir -and -Not (Get-ChildItem -Path $oldFrontedDir)) {
    Remove-Item -Path $oldFrontedDir -Force
    Write-Host "Removed empty Fronted directory" -ForegroundColor Yellow
    git rm -r $oldFrontedDir
}

# Move Backend/MyBachelor_Backend-main to Backend/MyBachelor if needed
$oldBackendPath = Join-Path $localRepoPath "Backend/MyBachelor_Backend-main"
$newBackendPath = Join-Path $backendDir "MyBachelor"
if (Test-Path $oldBackendPath) {
    Move-Item -Path $oldBackendPath -Destination $newBackendPath -Force
    Write-Host "Renamed Backend/MyBachelor_Backend-main to Backend/MyBachelor" -ForegroundColor Yellow
    git add $oldBackendPath
    git add $newBackendPath
}

# Commit restructuring changes if any
$restructureChanges = git status --porcelain
if ($restructureChanges) {
    git commit -m "Restructured repository: organized files into docs/, scripts/, Frontend/, Backend/"
}

# Step 6: Sync and update files from Backend and Frontend directories, excluding node_modules
$sourcePaths = @($backendPath, $frontendPath)
$modifiedCount = 0
foreach ($sourcePath in $sourcePaths) {
    if (Test-Path $sourcePath) {
        Write-Host "Processing files from $sourcePath..." -ForegroundColor Cyan
        $sourceFiles = Get-ChildItem -Path $sourcePath -File -Recurse -Exclude "node_modules"
        foreach ($file in $sourceFiles) {
            if ($file.FullName -match [regex]::Escape("node_modules")) {
                continue
            }
            $relativePath = $file.FullName.Substring($sourcePath.Length).TrimStart('\')
            # Adjust target path based on new structure
            $targetBaseDir = if ($sourcePath -eq $backendPath) { $backendDir } else { $frontendDir }
            $targetPath = Join-Path $targetBaseDir $relativePath

            $targetDir = Split-Path $targetPath -Parent
            if (-Not (Test-Path $targetDir)) {
                New-Item -Path $targetDir -ItemType Directory -Force | Out-Null
            }

            if (Test-Path $targetPath) {
                $sourceContent = Get-Content -Path $file.FullName -Raw
                $targetContent = Get-Content -Path $targetPath -Raw
                if ($sourceContent -ne $targetContent) {
                    Copy-Item -Path $file.FullName -Destination $targetPath -Force
                    Write-Host "Updated existing file: $relativePath" -ForegroundColor Yellow
                    git add $targetPath
                    $modifiedCount++
                }
            } else {
                Copy-Item -Path $file.FullName -Destination $targetPath -Force
                Write-Host "Added new file: $relativePath" -ForegroundColor Yellow
                git add $targetPath
                $modifiedCount++
            }
        }
    } else {
        Write-Host "Warning: Directory not found: $sourcePath" -ForegroundColor Yellow
    }
}

# Step 7: Check for changes to commit
Write-Host "Checking for changes in the repository..." -ForegroundColor Cyan
$stagedChanges = git status --porcelain
if ($stagedChanges) {
    Write-Host "Changes detected:" -ForegroundColor Yellow
    Write-Host $stagedChanges
} else {
    Write-Host "No changes to commit." -ForegroundColor Green
    goto DisconnectCredentials
}

# Step 8: Set up temporary Git identity if needed
$userEmail = git config user.email
$userName = git config user.name
$needTempIdentity = $false
if (-not $userEmail -or -not $userName) {
    $needTempIdentity = $true
    Write-Host "Setting up temporary Git identity for this commit only..." -ForegroundColor Yellow
    git config user.email "temp@example.com"
    git config user.name "Temporary User"
}

# Step 9: Commit changes with a descriptive message
$commitMessage = "Updated $modifiedCount files from local directories on $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "Committing changes with message: $commitMessage" -ForegroundColor Cyan
try {
    git commit -m "$commitMessage"
} catch {
    if ($needTempIdentity) {
        git config --unset user.email
        git config --unset user.name
    }
    Handle-Error "Failed to commit changes."
}

# Step 10: Push updates to GitHub
Write-Host "Pushing updates to $repoUrl..." -ForegroundColor Cyan
try {
    git push origin $branchName
} catch {
    if ($needTempIdentity) {
        git config --unset user.email
        git config --unset user.name
    }
    Handle-Error "Failed to push changes. Check network or authentication."
}

# Clean up temporary identity if it was created
if ($needTempIdentity) {
    git config --unset user.email
    git config --unset user.name
}

# Step 11: Thoroughly disconnect GitHub credentials
:DisconnectCredentials
Write-Host "Thoroughly disconnecting GitHub credentials..." -ForegroundColor Cyan
git credential reject https://github.com
git config --unset credential.helper
if (Get-Command cmdkey -ErrorAction SilentlyContinue) {
    Write-Host "Removing GitHub entries from Windows Credential Manager..." -ForegroundColor Cyan
    cmdkey /list | Where-Object { $_ -like "*github*" } | ForEach-Object {
        $target = ($_ -split "Target:")[1].Trim()
        if ($target) {
            cmdkey /delete:$target
        }
    }
}
$env:GIT_ASKPASS = ""
$env:SSH_ASKPASS = ""

# Return to original directory
Set-Location $backendPath

Write-Host "GitHub connections fully removed. You can now use Expo without interference." -ForegroundColor Green
Write-Host "Repository update completed successfully!" -ForegroundColor Green