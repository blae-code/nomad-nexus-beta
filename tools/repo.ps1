param(
  [Parameter(Mandatory=$true)]
  [ValidateSet("status","branch","commit","push","sync","discard","reset-hard","log")]
  [string]$Action,

  [string]$Name = "",
  [string]$Message = ""
)

function Ensure-Git {
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "git not found. Install Git for Windows first."
    exit 1
  }
}

Ensure-Git

switch ($Action) {
  "status" {
    git status
  }

  "branch" {
    if ([string]::IsNullOrWhiteSpace($Name)) {
      Write-Error "Provide -Name for branch (e.g. fix/commsconsole-500)"
      exit 1
    }
    git checkout -b $Name
    git status
  }

  "commit" {
    if ([string]::IsNullOrWhiteSpace($Message)) {
      Write-Error "Provide -Message for commit."
      exit 1
    }
    git add -A
    git commit -m $Message
    git status
  }

  "push" {
    $branch = (git rev-parse --abbrev-ref HEAD).Trim()
    git push -u origin $branch
  }

  "sync" {
    git fetch origin
    git pull --rebase
  }

  "discard" {
    Write-Host "Discarding ALL uncommitted changes..." -ForegroundColor Yellow
    git restore .
    git clean -fd
    git status
  }

  "reset-hard" {
    Write-Host "HARD RESET to origin/main (DESTROYS local changes)..." -ForegroundColor Red
    git fetch origin
    git reset --hard origin/main
    git clean -fd
    git status
  }

  "log" {
    git --no-pager log --oneline --decorate -n 20
  }
}
