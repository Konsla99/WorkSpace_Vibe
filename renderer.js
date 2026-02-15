// Elements
const workspaceSelectScreen = document.getElementById('placeholder');
const terminalWrapper = document.getElementById('terminal-wrapper');
const terminalBody = document.getElementById('terminal-body');
const selectWorkspaceBtn = document.getElementById('select-ws-btn');
const sidebar = document.querySelector('.sidebar');
const pathTextElement = document.getElementById('path-text');
const applyInstructionBtn = document.getElementById('apply-instruction-btn');
const showGuideBtn = document.getElementById('show-guide-btn');
const appStatus = document.getElementById('app-status');

// Global state
let term;
let fitAddon;
let currentWorkspacePath = null;
let isReady = false;

function updateStatus(text, color = '#007acc') {
    if (appStatus) {
        appStatus.innerText = text;
        appStatus.style.color = color;
    }
}

function initializeTerminal() {
    term = new Terminal({
        fontFamily: '"Cascadia Code", monospace',
        fontSize: 14,
        lineHeight: 1.2,
        cursorBlink: true,
        theme: {
            background: '#1e1e1e',
            foreground: '#d4d4d4',
            cursor: '#d4d4d4',
            selectionBackground: '#5c5c5c',
        }
    });
    
    fitAddon = new FitAddon.FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalBody);
    fitAddon.fit();

    term.onData(data => {
        window.electronAPI.sendTerminalInput(data);
    });

    window.electronAPI.onTerminalIncomingData((event, data) => {
        term.write(data);
        
        // 상태 감지: 터미널에 글자가 들어오기 시작하면 즉시 '준비 완료'
        if (!isReady && data.trim().length > 0) {
            isReady = true;
            updateStatus('Gemini 준비 완료', '#00ff00');
        }
    });

    window.electronAPI.onTerminalExit(() => {
        term.write('\r\nTerminal disconnected.\r\n');
        updateStatus('연결 끊김', '#ff5252');
        isReady = false;
    });

    window.addEventListener('resize', () => {
        fitAddon.fit();
        window.electronAPI.resizeTerminal(term.cols, term.rows);
    });

    // 터미널 초기화 시 인자 없이 호출 (main.js의 기본값 gemini 사용)
    window.electronAPI.initTerminal();
}

async function handleWorkspaceSelection() {
    updateStatus('워크스페이스 설정 중...');
    const workspacePath = await window.electronAPI.selectFolder();
    if (workspacePath) {
        currentWorkspacePath = workspacePath;
        pathTextElement.innerText = "Active: " + currentWorkspacePath;
        workspaceSelectScreen.style.display = 'none';
        terminalWrapper.style.display = 'flex';
        sidebar.style.display = 'flex';
        updateStatus('호출 중...', '#ffca28');
        isReady = false;
        initializeTerminal();
    } else {
        updateStatus('대기 중...');
    }
}

function setupSidebarButtonListeners() {
    if (selectWorkspaceBtn) {
        selectWorkspaceBtn.addEventListener('click', handleWorkspaceSelection);
    }

    if (applyInstructionBtn) {
        applyInstructionBtn.addEventListener('click', (e) => {
            if (terminalWrapper.style.display === 'none') {
                alert("먼저 워크스페이스를 지정하세요!");
                return;
            }
            // 포커스 해제 및 터미널 포커스
            applyInstructionBtn.blur();
            if (term) term.focus();

            // 명령어 텍스트만 전송
            window.electronAPI.sendCommandToTerminal("Get-Content 지침.md | gemini");
            
            // 약간의 딜레이 후 진짜 엔터 신호 주입
            setTimeout(() => {
                window.electronAPI.triggerHardwareEnter();
            }, 100);
        });
    }

    // Feature Buttons (1-5)
    const sidebarButtons = document.querySelectorAll('.sidebar button[data-command]');
    sidebarButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (terminalWrapper.style.display === 'none') {
                alert("먼저 워크스페이스를 지정하세요!");
                return;
            }
            button.blur();
            if (term) term.focus();

            const command = button.dataset.command;
            // 숫자/명령어 전송
            window.electronAPI.sendCommandToTerminal(command);
            
            // 진짜 엔터 신호 주입
            setTimeout(() => {
                window.electronAPI.triggerHardwareEnter();
            }, 100);
        });
    });

    if (showGuideBtn) {
        showGuideBtn.addEventListener('click', () => {
            window.electronAPI.showSetupGuide();
        });
    }
}

window.onload = async () => {
    setupSidebarButtonListeners();
    const initialWorkspace = await window.electronAPI.getInitialWorkspace();
    if (initialWorkspace) {
        currentWorkspacePath = initialWorkspace;
        pathTextElement.innerText = "Active: " + currentWorkspacePath;
        workspaceSelectScreen.style.display = 'none';
        terminalWrapper.style.display = 'flex';
        sidebar.style.display = 'flex';
        updateStatus('호출 중...', '#ffca28');
        isReady = false;
        initializeTerminal();
    } else {
        workspaceSelectScreen.style.display = 'flex';
        terminalWrapper.style.display = 'none';
        updateStatus('대기 중...');
    }
};

window.onbeforeunload = () => {
    window.electronAPI.removeTerminalIncomingDataListener();
    window.electronAPI.removeTerminalExitListener();
};
