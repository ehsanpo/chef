# Chef Game & Watch — Desktop (.EXE)

Standalone Windows Desktop application built with **Wails v3** (Go + Web frontend).

## Build & Run Executable (.exe)

### Quick Build (PowerShell / Command Prompt)

```powershell
cd c:\Users\Ehsan\dev\chef\desktop

# Build the standalone Windows executable
go build -buildvcs=false -ldflags "-s -w" -o ChefGame.exe .
```

The generated standalone executable `ChefGame.exe` will be located in `desktop/ChefGame.exe`.

### Using Wails3 / Task CLI

```powershell
cd c:\Users\Ehsan\dev\chef\desktop

# Build using Taskfile
task build
# or
wails3 build
```
