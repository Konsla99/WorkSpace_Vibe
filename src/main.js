const { app, BrowserWindow, ipcMain, dialog, shell: electronShell } = require('electron');
const path = require('path');
const pty = require('node-pty');
const os = require('os');
const fs = require('fs');

let mainWindow;
let ptyProcess;
let currentWorkspace = null;

const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    mainWindow.loadFile(path.join(__dirname, 'design.html'));

    // Open the DevTools.
    // mainWindow.webContents.openDevTools();

    mainWindow.on('closed', () => {
        mainWindow = null;
        if (ptyProcess) {
            ptyProcess.kill();
        }
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC handlers
ipcMain.handle('select-folder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
    });
    if (!canceled && filePaths.length > 0) {
        currentWorkspace = filePaths[0];
        return currentWorkspace;
    }
    return null;
});

ipcMain.on('init-terminal', (event) => {
    if (ptyProcess) {
        ptyProcess.kill();
    }

    ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd: currentWorkspace || process.env.HOME,
        env: process.env,
    });

    ptyProcess.onData((data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('terminal-incoming-data', data);
        }
    });

    ptyProcess.onExit(({ exitCode, signal }) => {
        console.log(`Terminal exited with code ${exitCode}, signal ${signal}`);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('terminal-exit');
        }
    });

    // Initial commands - Give a small delay to ensure shell is ready
    setTimeout(() => {
        if (currentWorkspace) {
            ptyProcess.write(`cd "${currentWorkspace}"\r\n`);
            
            setTimeout(() => {
                ptyProcess.write(`gemini\r\n`);
            }, 1000);
        } else {
            ptyProcess.write(`gemini\r\n`);
        }
    }, 2000);
});

ipcMain.on('terminal-input', (event, input) => {
    if (ptyProcess) {
        ptyProcess.write(input);
    }
});

ipcMain.on('resize-terminal', (event, cols, rows) => {
    if (ptyProcess) {
        ptyProcess.resize(cols, rows);
    }
});

ipcMain.handle('get-initial-workspace', () => {
    return currentWorkspace;
});

ipcMain.on('send-command-to-terminal', (event, command) => {
    if (ptyProcess) {
        ptyProcess.write(command); 
    }
});

ipcMain.on('trigger-hardware-enter', () => {
    const { exec } = require('child_process');
    // design.html의 <title>과 일치해야 함
    const windowTitle = 'Resume_Gem';
    const powershellCmd = `powershell -NoProfile -Command "$wshell = New-Object -ComObject WScript.Shell; if($wshell.AppActivate('${windowTitle}')) { Start-Sleep -m 50; $wshell.SendKeys('~') }"`;
    exec(powershellCmd);
});

ipcMain.handle('read-instruction', async (event, workspacePath) => {
    try {
        const filePath = path.join(workspacePath, '지침.md');
        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, 'utf8');
        }
        return null;
    } catch (err) {
        console.error(err);
        return null;
    }
});

ipcMain.on('show-setup-guide', () => {
    const guidePath = path.join(__dirname, '..', 'docs', '설정 방법.md');
    if (fs.existsSync(guidePath)) {
        electronShell.openPath(guidePath);
    } else {
        dialog.showErrorBox('오류', '설정 방법.md 파일을 찾을 수 없습니다.');
    }
});