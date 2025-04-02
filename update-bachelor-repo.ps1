# This script updates the 'bachelor' repository with changes from local Backend and Fronted directories.
# It ensures no duplication, preserves structure, and disconnects GitHub credentials after pushing.

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
$confirmation = Read-Host "Are you sure you want to update $localRepoPath with changes from these directories? (yes/y)"
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
if (-Not (Test-Path $gitignorePath)) {
    Write-Host "Creating .gitignore file..." -ForegroundColor Cyan
    @"
node_modules/
.env
dist/
"@ | Out-File -Encoding utf8 $gitignorePath
    git add $gitignorePath
    git commit -m "Added .gitignore to exclude unnecessary files"
}

# Step 5: Sync and update files from Backend and Frontend directories
$sourcePaths = @($backendPath, $frontendPath)
$modifiedCount = 0
foreach ($sourcePath in $sourcePaths) {
    if (Test-Path $sourcePath) {
        Write-Host "Processing files from $sourcePath..." -ForegroundColor Cyan
        $sourceFiles = Get-ChildItem -Path $sourcePath -File -Recurse
        foreach ($file in $sourceFiles) {
            $relativePath = $file.FullName.Substring($sourcePath.Length).TrimStart('\')
            $targetPath = Join-Path $localRepoPath $relativePath

            # Ensure directory structure exists
            $targetDir = Split-Path $targetPath -Parent
            if (-Not (Test-Path $targetDir)) {
                New-Item -Path $targetDir -ItemType Directory -Force | Out-Null
            }

            # Copy and update file if it differs or doesn’t exist
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

# Step 6: Check for changes to commit
Write-Host "Checking for changes in the repository..." -ForegroundColor Cyan
$stagedChanges = git status --porcelain
if ($stagedChanges) {
    Write-Host "Changes detected:" -ForegroundColor Yellow
    Write-Host $stagedChanges
} else {
    Write-Host "No changes to commit." -ForegroundColor Green
    exit
}

# Step 7: Commit changes with a descriptive message
$commitMessage = "Updated $modifiedCount files from local directories on $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "Committing changes with message: $commitMessage" -ForegroundColor Cyan
try {
    git commit -m "$commitMessage"
} catch {
    Handle-Error "Failed to commit changes."
}

# Step 8: Push updates to GitHub
Write-Host "Pushing updates to $repoUrl..." -ForegroundColor Cyan
try {
    git push origin $branchName
} catch {
    Handle-Error "Failed to push changes. Check network or authentication."
}

# Step 9: Disconnect GitHub credentials
Write-Host "Disconnecting GitHub credentials..." -ForegroundColor Cyan
git credential reject https://github.com
git config --unset credential.helper

Write-Host "Repository update completed successfully!" -ForegroundColor Green