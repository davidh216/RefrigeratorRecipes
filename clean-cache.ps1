# Next.js Cache Cleanup Script for Windows
# Run this script when you encounter build cache issues

Write-Host "🧹 Next.js Cache Cleanup Tool" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Function to check if directory exists and remove it
function Remove-Directory {
    param(
        [string]$Path,
        [string]$Description
    )
    
    if (Test-Path $Path) {
        try {
            Remove-Item -Recurse -Force $Path
            Write-Host "✅ Successfully removed $Description" -ForegroundColor Green
            return $true
        }
        catch {
            Write-Host "❌ Failed to remove $Description`: $($_.Exception.Message)" -ForegroundColor Red
            return $false
        }
    }
    else {
        Write-Host "ℹ️  $Description not found, skipping..." -ForegroundColor Yellow
        return $true
    }
}

# Function to kill Node.js processes
function Stop-NodeProcesses {
    Write-Host "Stopping Node.js processes..." -ForegroundColor Yellow
    try {
        $processes = Get-Process -Name "node" -ErrorAction SilentlyContinue
        if ($processes) {
            $processes | Stop-Process -Force
            Write-Host "✅ Node.js processes stopped" -ForegroundColor Green
        } else {
            Write-Host "ℹ️  No Node.js processes found" -ForegroundColor Gray
        }
    }
    catch {
        Write-Host "⚠️  Could not stop Node.js processes: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Main cleanup process
Write-Host "Starting cache cleanup..." -ForegroundColor Blue

# Stop Node processes first
Stop-NodeProcesses

# Wait a moment for processes to fully stop
Start-Sleep -Seconds 2

# Remove cache directories
$success = $true
$success = $success -and (Remove-Directory ".next" "Next.js build cache")
$success = $success -and (Remove-Directory "node_modules\.cache" "Node modules cache")

# Check if we should do a full reset
$fullReset = Read-Host "Do you want to do a full reset (remove node_modules and reinstall)? (y/N)"
if ($fullReset -eq "y" -or $fullReset -eq "Y") {
    Write-Host "Performing full reset..." -ForegroundColor Yellow
    
    $success = $success -and (Remove-Directory "node_modules" "Node modules")
    $success = $success -and (Remove-Directory "package-lock.json" "Package lock file")
    
    if ($success) {
        Write-Host "Installing dependencies..." -ForegroundColor Yellow
        try {
            npm install
            Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
        }
        catch {
            Write-Host "❌ Failed to install dependencies: $($_.Exception.Message)" -ForegroundColor Red
            $success = $false
        }
    }
}

# Final status
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
if ($success) {
    Write-Host "🎉 Cache cleanup completed successfully!" -ForegroundColor Green
    Write-Host "You can now run: npm run dev" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  Cache cleanup completed with some issues" -ForegroundColor Yellow
    Write-Host "You may need to run this script as Administrator" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
