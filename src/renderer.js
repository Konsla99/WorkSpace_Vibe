// Elements (will be assigned in setupSidebarButtonListeners)
let workspaceSelectScreen, terminalWrapper, terminalBody, selectWorkspaceBtn, sidebar, pathTextElement, applyInstructionBtn, showGuideBtn, appStatus;
let targetJobInput, saveResultBtn;
let btnJD, btnResume, btnExp, textJD, textResume, textExp;
let btnRunAnalysis, btnRunDraft, inputDraftItem, btnRunFeedback, btnRunInterview, btnRunHumanize;

// Global state
let term;
let fitAddon;
let currentWorkspacePath = null;
let isReady = false;

// Shared File Paths State
let sharedFiles = {
    jd: null,
    resume: null,
    exp: null
};

// Result Saving State
let lastOutputBuffer = ""; // 터미널의 실시간 출력을 담을 버퍼
let isCollecting = false; // 현재 명령어 실행 중인지 여부

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
    // 모든 파일 선택 버튼 및 기능 버튼 활성화
    const interactables = document.querySelectorAll('.sidebar button:not(#select-ws-btn):not(#show-guide-btn):not(#apply-instruction-btn), .sidebar input, #features-footer button, #features-footer input');
    interactables.forEach(el => {
        el.disabled = false;
    });
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
        
        // 데이터 수집 중이라면 버퍼에 추가 (특수문자 및 제어문자 제거 필터링 필요할 수 있음)
        if (isCollecting) {
            lastOutputBuffer += data;
        }
    });

    window.electronAPI.onGeminiReady(() => {
        // 로딩 완료 트리거 수신
        if (isCollecting) {
            isCollecting = false; // 수집 종료
            if (saveResultBtn) saveResultBtn.disabled = false; // 저장 버튼 활성화
        }

        if (!isReady) {
            isReady = true;
            updateStatus('Gemini 준비 완료', '#00ff00');
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

function startCollectingOutput() {
    lastOutputBuffer = ""; // 버퍼 초기화
    isCollecting = true;   // 수집 시작
    if (saveResultBtn) saveResultBtn.disabled = true; // 실행 중엔 저장 방지
}

function setupSidebarButtonListeners() {
    // DOM 요소 할당
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
    saveResultBtn = document.getElementById('save-result-btn');

    // 파일 선택 요소
    btnJD = document.getElementById('select-jd-btn');
    textJD = document.getElementById('jd-name');
    btnResume = document.getElementById('select-resume-btn');
    textResume = document.getElementById('resume-name');
    btnExp = document.getElementById('select-exp-btn');
    textExp = document.getElementById('exp-name');

    // 기능 실행 요소
    btnRunAnalysis = document.getElementById('run-analysis-btn');
    btnRunDraft = document.getElementById('run-draft-btn');
    inputDraftItem = document.getElementById('draft-item-input');
    btnRunFeedback = document.getElementById('run-feedback-btn');
    btnRunInterview = document.getElementById('run-interview-btn');
    btnRunHumanize = document.getElementById('run-humanize-btn');

    if (selectWorkspaceBtn) {
        selectWorkspaceBtn.addEventListener('click', handleWorkspaceSelection);
    }

    if (applyInstructionBtn) {
        applyInstructionBtn.addEventListener('click', (e) => {
            if (!isReady) return;
            const jobName = targetJobInput.value.trim();
            if (!jobName) {
                alert("희망 직무를 작성해 주세요!");
                targetJobInput.focus();
                return;
            }
            applyInstructionBtn.blur();
            if (term) term.focus();
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

    // 결과 저장 기능
    if (saveResultBtn) {
        saveResultBtn.addEventListener('click', async () => {
            if (!lastOutputBuffer) {
                alert("저장할 내용이 없습니다.");
                return;
            }

            // 터미널 제어 문자 제거 (ANSI escape codes 제거)
            const cleanContent = lastOutputBuffer.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, "").trim();
            
            const defaultName = `Resume_Gem_Result_${new Date().toISOString().slice(0,10)}.md`;
            const filePath = await window.electronAPI.saveFileDialog(defaultName);
            
            if (filePath) {
                const success = await window.electronAPI.writeResultFile(filePath, cleanContent);
                if (success) {
                    alert("성공적으로 저장되었습니다.");
                } else {
                    alert("저장에 실패했습니다.");
                }
            }
        });
    }

    // 공통 파일 선택 로직
    btnJD.addEventListener('click', async () => {
        const path = await window.electronAPI.selectFile();
        if (path) { sharedFiles.jd = path; textJD.innerText = "✓ " + window.electronAPI.getBasename(path); textJD.style.color = "#00ff00"; }
    });
    btnResume.addEventListener('click', async () => {
        const path = await window.electronAPI.selectFile();
        if (path) { sharedFiles.resume = path; textResume.innerText = "✓ " + window.electronAPI.getBasename(path); textResume.style.color = "#00ff00"; }
    });
    btnExp.addEventListener('click', async () => {
        const path = await window.electronAPI.selectFile();
        if (path) { sharedFiles.exp = path; textExp.innerText = "✓ " + window.electronAPI.getBasename(path); textExp.style.color = "#00ff00"; }
    });

    // 기능 실행 로직 (수집 시작 추가)
    btnRunAnalysis.addEventListener('click', () => {
        if (!sharedFiles.jd) { alert("JD 파일을 먼저 선택해주세요!"); return; }
        startCollectingOutput();
        btnRunAnalysis.blur(); if (term) term.focus();
        window.electronAPI.sendCommandToTerminal(`1번 직무 분석 수행. JD: "${sharedFiles.jd}"`);
        setTimeout(() => window.electronAPI.triggerHardwareEnter(), 100);
    });

    btnRunDraft.addEventListener('click', () => {
        if (!sharedFiles.exp) { alert("경험 기술서를 먼저 선택해주세요!"); return; }
        startCollectingOutput();
        btnRunDraft.blur(); if (term) term.focus();
        const item = inputDraftItem.value || "자유 항목";
        window.electronAPI.sendCommandToTerminal(`2번 자소서 초안 작성 수행. 항목: '${item}', 경험기술서: "${sharedFiles.exp}"`);
        setTimeout(() => window.electronAPI.triggerHardwareEnter(), 100);
    });

    btnRunFeedback.addEventListener('click', () => {
        if (!sharedFiles.resume || !sharedFiles.jd) { alert("자소서와 JD 파일을 모두 선택해주세요!"); return; }
        startCollectingOutput();
        btnRunFeedback.blur(); if (term) term.focus();
        window.electronAPI.sendCommandToTerminal(`3번 자소서 첨삭 수행. 작성된 자소서: "${sharedFiles.resume}", JD: "${sharedFiles.jd}"`);
        setTimeout(() => window.electronAPI.triggerHardwareEnter(), 100);
    });

    btnRunInterview.addEventListener('click', () => {
        if (!sharedFiles.resume || !sharedFiles.jd) { alert("자소서와 JD 파일을 모두 선택해주세요!"); return; }
        startCollectingOutput();
        btnRunInterview.blur(); if (term) term.focus();
        window.electronAPI.sendCommandToTerminal(`4번 면접 질문 도출 수행. 자소서: "${sharedFiles.resume}", JD: "${sharedFiles.jd}"`);
        setTimeout(() => window.electronAPI.triggerHardwareEnter(), 100);
    });

    btnRunHumanize.addEventListener('click', () => {
        if (!sharedFiles.resume) { alert("자소서 파일을 선택해주세요!"); return; }
        startCollectingOutput();
        btnRunHumanize.blur(); if (term) term.focus();
        window.electronAPI.sendCommandToTerminal(`5번 AI 표현 다듬기 수행. 자소서: "${sharedFiles.resume}"`);
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
