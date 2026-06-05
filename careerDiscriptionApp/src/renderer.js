// Elements
let workspaceSelectScreen, terminalWrapper, terminalBody, selectWorkspaceBtn, sidebar, pathTextElement, applyInstructionBtn, showGuideBtn, appStatus;
let targetJobInput, editJobBtn, saveResultBtn;
let btnJD, btnResume, btnExp, textJD, textResume, textExp;
let btnRunAnalysis, btnRunDraft, inputDraftItem, btnRunFeedback, btnRunInterview, btnRunHumanize;

// Global state
let term;
let fitAddon;
let currentWorkspacePath = null;
let isReady = false;

// Shared File Paths State
let sharedFiles = { jd: null, resume: null, exp: null };

// Result Saving State
let startLineIndex = 0; 
let lastActionName = "Result";

function updateStatus(text, color = '#007acc') {
    if (appStatus) {
        appStatus.innerText = text;
        appStatus.style.color = color;
    }
}

function enableInstructionButton() {
    if (applyInstructionBtn) applyInstructionBtn.disabled = false;
}

function enableFeatureButtons(enabled = true) {
    const interactables = document.querySelectorAll('#features-footer button, #features-footer input, #select-jd-btn, #select-resume-btn, #select-exp-btn');
    interactables.forEach(el => {
        el.disabled = !enabled;
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
    
    setTimeout(() => fitAddon.fit(), 100);

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
            enableInstructionButton();
        } else {
            // 이미 준비된 상태에서 트리거가 왔다면 답변이 종료된 것으로 간주
            if (saveResultBtn && saveResultBtn.disabled) {
                saveResultBtn.disabled = false;
                updateStatus('Gemini 준비 완료 (결과 저장 가능)', '#00ff00');
            }
        }
    });

    window.electronAPI.onTerminalExit(() => {
        term.write('\r\nTerminal disconnected.\r\n');
        updateStatus('연결 끊김', '#ff5252');
        isReady = false;
    });

    const resizeObserver = new ResizeObserver(() => {
        if (terminalWrapper && terminalWrapper.style.display !== 'none') {
            fitAddon.fit();
            window.electronAPI.resizeTerminal(term.cols, term.rows);
        }
    });
    resizeObserver.observe(terminalBody);

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

function getTerminalResponse() {
    const buffer = term.buffer.active;
    let responseText = "";
    // 명령어 전송 시점부터 현재 커서 위치까지 버퍼 추출
    for (let i = startLineIndex; i < buffer.baseY + buffer.cursorY; i++) {
        const line = buffer.getLine(i);
        if (line) {
            responseText += line.translateToString().trimEnd() + "\n";
        }
    }
    return responseText
        .replace(/Type\s+your\s+message.*/gi, "")
        .replace(/~\/workspace.*\/model/gi, "")
        .trim();
}

function startAction(actionName) {
    // 현재 버퍼의 마지막 위치를 시작점으로 기록
    startLineIndex = term.buffer.active.baseY + term.buffer.active.cursorY;
    lastActionName = actionName;
    if (saveResultBtn) saveResultBtn.disabled = true;
    updateStatus('Gemini 분석 중...', '#ffca28');
}

function setupSidebarButtonListeners() {
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
    editJobBtn = document.getElementById('edit-job-btn');
    saveResultBtn = document.getElementById('save-result-btn');

    btnJD = document.getElementById('select-jd-btn');
    textJD = document.getElementById('jd-name');
    btnResume = document.getElementById('select-resume-btn');
    textResume = document.getElementById('resume-name');
    btnExp = document.getElementById('select-exp-btn');
    textExp = document.getElementById('exp-name');

    btnRunAnalysis = document.getElementById('run-analysis-btn');
    btnRunDraft = document.getElementById('run-draft-btn');
    inputDraftItem = document.getElementById('draft-item-input');
    btnRunFeedback = document.getElementById('run-feedback-btn');
    btnRunInterview = document.getElementById('run-interview-btn');
    btnRunHumanize = document.getElementById('run-humanize-btn');

    if (selectWorkspaceBtn) {
        selectWorkspaceBtn.addEventListener('click', handleWorkspaceSelection);
    }

    if (editJobBtn) {
        editJobBtn.addEventListener('click', () => {
            targetJobInput.disabled = false;
            applyInstructionBtn.disabled = false;
            editJobBtn.style.display = 'none';
            enableFeatureButtons(false);
            updateStatus('직무 수정 중...', '#ffca28');
        });
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
                    enableFeatureButtons(true);
                    applyInstructionBtn.disabled = true;
                    targetJobInput.disabled = true; 
                    editJobBtn.style.display = 'block';
                    updateStatus('Gemini 준비 완료', '#00ff00');
                }, 500);
            }, 200);
        });
    }

    if (saveResultBtn) {
        saveResultBtn.addEventListener('click', async () => {
            const content = getTerminalResponse();
            if (!content || content.length < 5) {
                alert("저장할 내용이 없거나 너무 짧습니다.");
                return;
            }
            const defaultName = `Resume_Gem_${lastActionName}_${new Date().toISOString().slice(0,10)}.md`;
            const filePath = await window.electronAPI.saveFileDialog(defaultName);
            if (filePath) {
                const success = await window.electronAPI.writeResultFile(filePath, content);
                if (success) alert("성공적으로 저장되었습니다.");
                else alert("저장에 실패했습니다.");
            }
        });
    }

    if (btnJD) {
        btnJD.addEventListener('click', async () => {
            const path = await window.electronAPI.selectFile();
            if (path) { sharedFiles.jd = path; textJD.innerText = "✓ " + window.electronAPI.getBasename(path); textJD.style.color = "#00ff00"; }
        });
    }
    if (btnResume) {
        btnResume.addEventListener('click', async () => {
            const path = await window.electronAPI.selectFile();
            if (path) { sharedFiles.resume = path; textResume.innerText = "✓ " + window.electronAPI.getBasename(path); textResume.style.color = "#00ff00"; }
        });
    }
    if (btnExp) {
        btnExp.addEventListener('click', async () => {
            const path = await window.electronAPI.selectFile();
            if (path) { sharedFiles.exp = path; textExp.innerText = "✓ " + window.electronAPI.getBasename(path); textExp.style.color = "#00ff00"; }
        });
    }

    if (btnRunAnalysis) {
        btnRunAnalysis.addEventListener('click', () => {
            if (!sharedFiles.jd) { alert("JD 파일을 먼저 선택해주세요!"); return; }
            startAction("직무분석");
            btnRunAnalysis.blur(); if (term) term.focus();
            window.electronAPI.sendCommandToTerminal(`1번 직무 분석 수행. JD: "${sharedFiles.jd}"`);
            setTimeout(() => window.electronAPI.triggerHardwareEnter(), 100);
        });
    }

    if (btnRunDraft) {
        btnRunDraft.addEventListener('click', () => {
            if (!sharedFiles.exp) { alert("경험 기술서를 먼저 선택해주세요!"); return; }
            startAction("자소서초안");
            btnRunDraft.blur(); if (term) term.focus();
            const item = inputDraftItem.value || "자유 항목";
            window.electronAPI.sendCommandToTerminal(`2번 자소서 초안 작성 수행. 항목: '${item}', 경험기술서: "${sharedFiles.exp}"`);
            setTimeout(() => window.electronAPI.triggerHardwareEnter(), 100);
        });
    }

    if (btnRunFeedback) {
        btnRunFeedback.addEventListener('click', () => {
            if (!sharedFiles.resume || !sharedFiles.jd) { alert("자소서와 JD 파일을 모두 선택해주세요!"); return; }
            startAction("첨삭피드백");
            btnRunFeedback.blur(); if (term) term.focus();
            window.electronAPI.sendCommandToTerminal(`3번 자소서 첨삭 수행. 작성된 자소서: "${sharedFiles.resume}", JD: "${sharedFiles.jd}"`);
            setTimeout(() => window.electronAPI.triggerHardwareEnter(), 100);
        });
    }

    if (btnRunInterview) {
        btnRunInterview.addEventListener('click', () => {
            if (!sharedFiles.resume || !sharedFiles.jd) { alert("자소서와 JD 파일을 모두 선택해주세요!"); return; }
            startAction("면접질문");
            btnRunInterview.blur(); if (term) term.focus();
            window.electronAPI.sendCommandToTerminal(`4번 면접 질문 도출 수행. 자소서: "${sharedFiles.resume}", JD: "${sharedFiles.jd}"`);
            setTimeout(() => window.electronAPI.triggerHardwareEnter(), 100);
        });
    }

    if (btnRunHumanize) {
        btnRunHumanize.addEventListener('click', () => {
            if (!sharedFiles.resume) { alert("자소서 파일을 선택해주세요!"); return; }
            startAction("표현다듬기");
            btnRunHumanize.blur(); if (term) term.focus();
            window.electronAPI.sendCommandToTerminal(`5번 AI 표현 다듬기 수행. 자소서: "${sharedFiles.resume}"`);
            setTimeout(() => window.electronAPI.triggerHardwareEnter(), 100);
        });
    }

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
