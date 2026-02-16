// Elements (will be assigned in setupSidebarButtonListeners)
let workspaceSelectScreen, terminalWrapper, terminalBody, selectWorkspaceBtn, sidebar, pathTextElement, applyInstructionBtn, showGuideBtn, appStatus;
let targetJobInput;
let f1JD, f1Run, f2Item, f2Exp, f2Run, f3Resume, f3JD, f3Run, f4Resume, f4JD, f4Run, f5Resume, f5Run;

// Global state
let term;
let fitAddon;
let currentWorkspacePath = null;
let isReady = false;

// File Paths State
let selectedFiles = {
    f1JD: null,
    f2Exp: null,
    f3Resume: null,
    f3JD: null,
    f4Resume: null,
    f4JD: null,
    f5Resume: null
};

function updateStatus(text, color = '#007acc') {
    if (appStatus) {
        appStatus.innerText = text;
        appStatus.style.color = color;
    }
}

function enableInstructionButton() {
    if (applyInstructionBtn) applyInstructionBtn.disabled = false;
}

function enableFeatureButtons() {
    // 모든 기능 버튼 및 입력창 활성화 (워크스페이스 및 지침 버튼 제외)
    const interactables = document.querySelectorAll('.sidebar button:not(#select-ws-btn):not(#show-guide-btn):not(#apply-instruction-btn), .sidebar input');
    interactables.forEach(el => {
        el.disabled = false;
    });
}

function initializeTerminal() {
    // ... (기존 initializeTerminal 로직 유지)
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
    });

    window.electronAPI.onGeminiReady(() => {
        if (!isReady) {
            isReady = true;
            updateStatus('Gemini 준비 완료', '#00ff00');
            // 2단계: 준비 완료 시 지침 버튼만 활성화
            enableInstructionButton();
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
        
        selectWorkspaceBtn.disabled = true;
        initializeTerminal();
    } else {
        updateStatus('대기 중...');
    }
}

function setupSidebarButtonListeners() {
    // DOM 요소 할당을 여기에서 수행
    workspaceSelectScreen = document.getElementById('placeholder');
    terminalWrapper = document.getElementById('terminal-wrapper');
    terminalBody = document.getElementById('terminal-body');
    selectWorkspaceBtn = document.getElementById('select-ws-btn');
    sidebar = document.querySelector('.sidebar');
    pathTextElement = document.getElementById('path-text');
    applyInstructionBtn = document.getElementById('apply-instruction-btn');
    showGuideBtn = document.getElementById('show-guide-btn');
    appStatus = document.getElementById('app-status');
    targetJobInput = document.getElementById('target-job-input');

    f1JD = document.getElementById('f1-jd-btn');
    f1Run = document.getElementById('f1-run-btn');
    f2Item = document.getElementById('f2-item-input');
    f2Exp = document.getElementById('f2-exp-btn');
    f2Run = document.getElementById('f2-run-btn');
    f3Resume = document.getElementById('f3-resume-btn');
    f3JD = document.getElementById('f3-jd-btn');
    f3Run = document.getElementById('f3-run-btn');
    f4Resume = document.getElementById('f4-resume-btn');
    f4JD = document.getElementById('f4-jd-btn');
    f4Run = document.getElementById('f4-run-btn');
    f5Resume = document.getElementById('f5-resume-btn');
    f5Run = document.getElementById('f5-run-btn');

    if (selectWorkspaceBtn) {
        selectWorkspaceBtn.addEventListener('click', handleWorkspaceSelection);
    }

    if (applyInstructionBtn) {
        applyInstructionBtn.addEventListener('click', (e) => {
            if (!isReady) return;
            
            // 희망 직무 입력값 확인
            const jobName = targetJobInput.value.trim();
            if (!jobName || jobName === "") {
                alert("희망 직무를 작성해 주세요!"); // 요청하신 메시지 문구 적용
                targetJobInput.focus();
                return;
            }

            applyInstructionBtn.blur();
            if (term) term.focus();
            
            // 희망 직무와 함께 지침 전달
            const cmd = `$희망직무 = '${jobName}'; Get-Content 지침.md | gemini`;
            window.electronAPI.sendCommandToTerminal(cmd);
            
            setTimeout(() => {
                window.electronAPI.triggerHardwareEnter();
                setTimeout(() => {
                    enableFeatureButtons();
                    applyInstructionBtn.disabled = true;
                    targetJobInput.disabled = true; 
                }, 500);
            }, 200);
        });
    }

    // Helper for file selection
    async function attachFile(btnElement, stateKey) {
        if (!isReady) return;
        const filePath = await window.electronAPI.selectFile();
        if (filePath) {
            selectedFiles[stateKey] = filePath;
            btnElement.innerText = "✓ " + window.electronAPI.getBasename(filePath);
            btnElement.style.color = "#00ff00";
        }
    }

    // Menu 1: 직무 분석
    if (f1JD) f1JD.addEventListener('click', () => attachFile(f1JD, 'f1JD'));
    if (f1Run) f1Run.addEventListener('click', () => {
        if (!isReady || !selectedFiles.f1JD) return;
        f1Run.blur(); if (term) term.focus();
        window.electronAPI.sendCommandToTerminal(`1번 직무 분석 수행. JD: "${selectedFiles.f1JD}"`);
        setTimeout(() => window.electronAPI.triggerHardwareEnter(), 100);
    });

    // Menu 2: 자소서 초안
    if (f2Exp) f2Exp.addEventListener('click', () => attachFile(f2Exp, 'f2Exp'));
    if (f2Run) f2Run.addEventListener('click', () => {
        if (!isReady || !selectedFiles.f2Exp) return;
        f2Run.blur(); if (term) term.focus();
        const item = f2Item.value || "자유 항목";
        window.electronAPI.sendCommandToTerminal(`2번 자소서 초안 작성 수행. 항목: '${item}', 경험기술서: "${selectedFiles.f2Exp}"`);
        setTimeout(() => window.electronAPI.triggerHardwareEnter(), 100);
    });

    // Menu 3: 첨삭 피드백
    if (f3Resume) f3Resume.addEventListener('click', () => attachFile(f3Resume, 'f3Resume'));
    if (f3JD) f3JD.addEventListener('click', () => attachFile(f3JD, 'f3JD'));
    if (f3Run) f3Run.addEventListener('click', () => {
        if (!isReady || !selectedFiles.f3Resume || !selectedFiles.f3JD) return;
        f3Run.blur(); if (term) term.focus();
        window.electronAPI.sendCommandToTerminal(`3번 자소서 첨삭 수행. 작성된 자소서: "${selectedFiles.f3Resume}", JD: "${selectedFiles.f3JD}"`);
        setTimeout(() => window.electronAPI.triggerHardwareEnter(), 100);
    });

    // Menu 4: 면접 질문
    if (f4Resume) f4Resume.addEventListener('click', () => attachFile(f4Resume, 'f4Resume'));
    if (f4JD) f4JD.addEventListener('click', () => attachFile(f4JD, 'f4JD'));
    if (f4Run) f4Run.addEventListener('click', () => {
        if (!isReady || !selectedFiles.f4Resume || !selectedFiles.f4JD) return;
        f4Run.blur(); if (term) term.focus();
        window.electronAPI.sendCommandToTerminal(`4번 면접 질문 도출 수행. 자소서: "${selectedFiles.f4Resume}", JD: "${selectedFiles.f4JD}"`);
        setTimeout(() => window.electronAPI.triggerHardwareEnter(), 100);
    });

    // Menu 5: 표현 다듬기
    if (f5Resume) f5Resume.addEventListener('click', () => attachFile(f5Resume, 'f5Resume'));
    if (f5Run) f5Run.addEventListener('click', () => {
        if (!isReady || !selectedFiles.f5Resume) return;
        f5Run.blur(); if (term) term.focus();
        window.electronAPI.sendCommandToTerminal(`5번 AI 표현 다듬기 수행. 자소서: "${selectedFiles.f5Resume}"`);
        setTimeout(() => window.electronAPI.triggerHardwareEnter(), 100);
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
