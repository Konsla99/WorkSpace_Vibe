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
        width: 1300,
        height: 900,
        minWidth: 1000,
        minHeight: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    // design.html 로드 경로도 __dirname 기준 절대 경로로 명시
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
        
        // 지침.md 자동 생성 및 갱신 로직 (배포 환경 대응)
        try {
            const targetPath = path.join(currentWorkspace, '지침.md');
            const sourcePath = path.join(app.getAppPath(), 'docs', '기능.md.txt');
            
            if (fs.existsSync(sourcePath)) {
                // 항상 최신 지침으로 덮어쓰기
                const content = fs.readFileSync(sourcePath, 'utf8');
                fs.writeFileSync(targetPath, content, 'utf8');
            }
        } catch (err) {
            console.error("지침 파일 복사 실패:", err);
        }

        return currentWorkspace;
    }
    return null;
});

ipcMain.handle('select-file', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Documents', extensions: ['txt', 'md', 'pdf', 'docx'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });
    if (!canceled && filePaths.length > 0) {
        return filePaths[0];
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
            
            // 사용자가 제안한 정규표현식으로 로딩 완료 감지
            const readyTriggerRegex = /Type\s+your\s+message\s+or\s+@path\/to\/file/i;
            if (readyTriggerRegex.test(data.toString())) {
                mainWindow.webContents.send('gemini-ready');
            }
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
    const windowTitle = 'Resume_Gem';
    // 확실한 입력을 위해 엔터(~)를 두 번 보냄 (Start-Sleep 활용)
    const powershellCmd = `powershell -NoProfile -Command "$wshell = New-Object -ComObject WScript.Shell; if($wshell.AppActivate('${windowTitle}')) { Start-Sleep -m 100; $wshell.SendKeys('~'); Start-Sleep -m 50; $wshell.SendKeys('~') }"`;
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
    const guidePath = path.join(app.getAppPath(), 'docs', '설정 방법.md');
    if (fs.existsSync(guidePath)) {
        electronShell.openPath(guidePath);
    } else {
        dialog.showErrorBox('오류', '설정 방법.md 파일을 찾을 수 없습니다.');
    }
});