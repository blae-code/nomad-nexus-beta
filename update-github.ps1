param(
    # Commit message; default can be overridden when running the script
    [string]$Message = "Update from VS Code"
)

function Ensure-Git {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Write-Error "Git is not installed. Please install Git for Windows and try again."
        exit 1
    }
}

Ensure-Git

# Stage all changes (new, modified, deleted)
git add -A

# Commit with the provided message
git commit -m $Message

# Determine current branch name
$branch = (git rev-parse --abbrev-ref HEAD).Trim()

# Push to remote on the same branch
git push -u origin $branch

Write-Host "✅ Repository updated: committed and pushed to '$branch'" -ForegroundColor Green
