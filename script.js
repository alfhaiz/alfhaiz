document.addEventListener("DOMContentLoaded", () => {
    // --- Elemen DOM ---
    const body = document.body;
    const menuToggleBtn = document.getElementById("menu-toggle-btn");
    const sidebarOverlay = document.getElementById("sidebar-overlay");
    const newChatBtn = document.getElementById("new-chat-btn");
    const chatContainer = document.getElementById("chat-container");
    const welcomeScreen = document.getElementById("welcome-screen");
    const chatInput = document.getElementById("chat-input");
    const generateBtn = document.getElementById("generate-btn");
    const historyContainer = document.getElementById("history-container");
    const voiceBtn = document.getElementById('voice-btn');
    const moreOptionsBtn = document.getElementById('more-options-btn');
    const filePopupMenu = document.getElementById('file-popup-menu');
    const attachFileBtn = document.getElementById('attach-file-btn');
    const attachCameraBtn = document.getElementById('attach-camera-btn');
    const fileInput = document.getElementById('file-input');
    const attachmentPreview = document.getElementById("attachment-preview");
    const voiceRecorderUI = document.getElementById('voice-recorder-ui');
    const recorderTimer = document.getElementById('recorder-timer');
    const waveformVisualizer = document.getElementById('waveform-visualizer');
    const recorderActions = document.querySelector('.recorder-actions');
    const recorderStatus = document.querySelector('.recorder-status');
    const deleteVoiceBtn = document.getElementById('delete-voice-btn');
    const sendVoiceBtn = document.getElementById('send-voice-btn');
    const inputWrapper = document.getElementById('input-wrapper');
    const modelSelectorBtn = document.getElementById('model-selector-btn');
    const modelModal = document.getElementById('model-modal');
    const modelOptions = document.querySelectorAll('.model-option');
    const modelDisplayName = document.getElementById('model-display-name');
    const notificationToast = document.getElementById('notification-toast');
    
    // Elemen Mode Agen (Builder)
    const agentModeBtn = document.getElementById('agent-mode-btn');
    const builderContainer = document.getElementById("builder-container");
    const fileListContainer = document.getElementById("file-list");
    const buildStatus = document.getElementById("build-status");
    const downloadSection = document.getElementById("download-section");
    const livePreviewIframe = document.getElementById("live-preview-iframe");

    // --- State Aplikasi ---
    let allChats = {};
    let currentChatId = null;
    let currentModel = 'gemini-1.5-pro-latest';
    let attachedFile = null;
    let isAgentMode = false;
    let isBuilding = false;
    let isRecording = false;
    let recognition;
    let timerInterval;
    let abortController;

    // --- Inisialisasi & Logika UI Dasar ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'id-ID';
        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
                else interimTranscript += event.results[i][0].transcript;
            }
            chatInput.value = finalTranscript + interimTranscript;
            autoResizeTextarea();
        };
        recognition.onend = () => { isRecording = false; clearInterval(timerInterval); recorderStatus.style.display = 'none'; recorderActions.style.display = 'flex'; };
        recognition.onerror = (event) => { console.error("Speech Recognition Error:", event.error); isRecording = false; clearInterval(timerInterval); voiceRecorderUI.style.display = 'none'; inputWrapper.style.display = 'flex'; };
    } else { if (voiceBtn) voiceBtn.disabled = true; }

    const formatTime = (seconds) => { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`; };
    const createVisualizerBars = () => { waveformVisualizer.innerHTML = ''; for (let i = 0; i < 20; i++) { const bar = document.createElement('div'); bar.className = 'waveform-bar'; bar.style.animationDelay = `${Math.random()*0.5}s`; bar.style.animationDuration = `${0.8+Math.random()*0.7}s`; waveformVisualizer.appendChild(bar); }};
    const showNotification = (message) => { notificationToast.textContent = message; notificationToast.classList.add('show'); setTimeout(() => { notificationToast.classList.remove('show'); }, 3000); };
    const scrollToBottom = () => { if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight; };
    const autoResizeTextarea = () => { chatInput.style.height = 'auto'; chatInput.style.height = `${chatInput.scrollHeight}px`; };

    menuToggleBtn.addEventListener("click", () => body.classList.toggle("sidebar-open"));
    sidebarOverlay.addEventListener("click", () => body.classList.remove("sidebar-open"));
    moreOptionsBtn.addEventListener('click', (e) => { e.stopPropagation(); filePopupMenu.classList.toggle('active'); });
    window.addEventListener("click", () => { filePopupMenu.classList.remove('active'); modelModal.classList.remove('active'); });
    attachFileBtn.addEventListener('click', () => { fileInput.removeAttribute('capture'); fileInput.setAttribute('accept', '*/*'); fileInput.click(); });
    attachCameraBtn.addEventListener('click', () => { fileInput.setAttribute('capture', 'environment'); fileInput.setAttribute('accept', 'image/*'); fileInput.click(); });
    voiceBtn.addEventListener('click', () => { if (!recognition) return; if (isRecording) { recognition.stop(); } else { isRecording = true; chatInput.value = ''; recognition.start(); voiceRecorderUI.style.display = 'flex'; inputWrapper.style.display = 'none'; recorderStatus.style.display = 'flex'; recorderActions.style.display = 'none'; createVisualizerBars(); let seconds = 0; recorderTimer.textContent = '00:00'; timerInterval = setInterval(() => { seconds++; recorderTimer.textContent = formatTime(seconds); }, 1000); }});
    deleteVoiceBtn.addEventListener('click', () => { chatInput.value = ''; voiceRecorderUI.style.display = 'none'; inputWrapper.style.display = 'flex'; });
    sendVoiceBtn.addEventListener('click', () => { voiceRecorderUI.style.display = 'none'; inputWrapper.style.display = 'flex'; handleSendMessage(); });
    modelSelectorBtn.addEventListener('click', (e) => { e.stopPropagation(); modelModal.classList.add('active'); });
    modelOptions.forEach(option => { option.addEventListener('click', () => { currentModel = option.dataset.model; modelDisplayName.textContent = option.dataset.displayName; document.querySelector('.model-option.selected').classList.remove('selected'); option.classList.add('selected'); modelModal.classList.remove('active'); showNotification(`${option.dataset.displayName.toUpperCase()} READY`); }); });
    fileInput.addEventListener('change', (event) => { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onloadend = () => { const dataUrl = reader.result; const base64Data = dataUrl.split(',')[1]; attachedFile = { mimeType: file.type, base64: base64Data }; displayAttachmentPreview(file.name, dataUrl); }; reader.readAsDataURL(file); filePopupMenu.classList.remove('active'); });
    chatInput.addEventListener('input', autoResizeTextarea);

    // --- Logika Inti ---
    agentModeBtn.addEventListener('click', () => {
        isAgentMode = !isAgentMode;
        agentModeBtn.classList.toggle('active');

        if (isAgentMode) {
            chatInput.placeholder = 'What should we create?';
            chatContainer.style.display = 'none';
            builderContainer.style.display = 'flex';
        } else {
            chatInput.placeholder = 'Ask me anything...';
            chatContainer.style.display = 'flex';
            builderContainer.style.display = 'none';
        }
    });

    const handleSendMessage = async () => {
        const prompt = chatInput.value.trim();
        if ((!prompt && !attachedFile) || isBuilding) return;

        if (isAgentMode) {
            await startBuildProcess(prompt);
        } else {
            await runChatMode(prompt);
        }
        
        chatInput.value = '';
        autoResizeTextarea();
    };

    generateBtn.onclick = handleSendMessage;
    chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    // --- Alur Mode Chat ---
    async function runChatMode(prompt) {
        displayUserMessage(prompt);
        clearAttachment();
        const loadingIndicator = appendLoadingIndicator();
        abortController = new AbortController();
        generateBtn.classList.add('generating');
        generateBtn.onclick = () => { abortController.abort(); };

        try {
            const result = await callApi('chat', allChats[currentChatId]);
            loadingIndicator.remove();
            displayAiMessage(result.data);
        } catch (error) {
            loadingIndicator.remove();
            if (error.name === 'AbortError') {
                displayAiMessage('Respon dihentikan.');
            } else {
                console.error("Error fetching AI response:", error);
                displayAiMessage('Maaf, terjadi kesalahan. 🤖');
            }
        } finally {
            generateBtn.classList.remove('generating');
            generateBtn.onclick = handleSendMessage;
        }
    }

    // --- Alur Kerja Builder (Tiru Manus.im) ---
    async function startBuildProcess(prompt) {
        isBuilding = true;
        generateBtn.disabled = true;
        fileListContainer.innerHTML = '';
        downloadSection.innerHTML = '';
        livePreviewIframe.srcdoc = '';
        buildStatus.textContent = 'Analyzing request and creating plan...';

        try {
            const planResponse = await callApi('agent_planner', [], `Create a plan for: ${prompt}`);
            const { files } = JSON.parse(planResponse.data);
            
            if (!files || files.length === 0) {
                throw new Error("AI did not return a valid file plan.");
            }

            files.forEach(fileName => {
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                fileItem.id = `file-${fileName.replace('.', '-')}`; // Handle dots in IDs
                fileItem.textContent = fileName;
                fileListContainer.appendChild(fileItem);
            });

            let generatedFiles = {};
            for (const fileName of files) {
                const fileItem = document.getElementById(`file-${fileName.replace('.', '-')}`);
                fileItem.classList.add('generating');
                buildStatus.textContent = `Generating ${fileName}...`;

                const context = `User's Goal: "${prompt}".\n\nPreviously generated files:\n${JSON.stringify(generatedFiles, null, 2)}\n\nGenerate the code ONLY for the file: ${fileName}`;
                
                const codeResponse = await callApi('agent_executor', [], context);
                const code = codeResponse.data;

                generatedFiles[fileName] = code;
                fileItem.classList.remove('generating');
                fileItem.classList.add('completed');
                
                updatePreview(generatedFiles);
            }

            buildStatus.textContent = 'Build complete!';
            createDownloadButtons(generatedFiles);

        } catch (error) {
            console.error("Build process failed:", error);
            buildStatus.textContent = 'Build failed. Please try again.';
        } finally {
            isBuilding = false;
            generateBtn.disabled = false;
        }
    }

    // --- Fungsi Helper untuk Builder ---
    function updatePreview(files) {
        const html = files['index.html'] || '';
        const css = files['style.css'] || '';
        const js = files['script.js'] || files['app.js'] || '';
        
        const srcDoc = `<!DOCTYPE html><html><head><style>${css}</style></head><body>${html}<script>${js}<\/script></body></html>`;
        livePreviewIframe.srcdoc = srcDoc;
    }

    function createDownloadButtons(files) {
        downloadSection.innerHTML = ''; // Clear previous buttons
        for (const fileName in files) {
            const link = document.createElement('a');
            const blob = new Blob([files[fileName]], { type: 'text/plain;charset=utf-8' });
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            link.className = 'download-link';
            link.textContent = `Download ${fileName}`;
            downloadSection.appendChild(link);
        }
    }

    // --- Fungsi API Call, Tampilan Pesan, dan History ---
    async function callApi(mode, history, context = null) {
        const body = { history, model: currentModel, mode, context };
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: (mode === 'chat') ? abortController?.signal : null,
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(errorBody.error || `HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }

    function displayUserMessage(prompt) {
        if (welcomeScreen) welcomeScreen.style.display = 'none';
        if (!currentChatId) {
            currentChatId = `chat_${Date.now()}`;
            allChats[currentChatId] = [];
            createHistoryItem(currentChatId, prompt || "Chat with attachment");
        }
        const userParts = [];
        const imageUrl = attachedFile ? `data:${attachedFile.mimeType};base64,${attachedFile.base64}` : null;
        if (attachedFile) userParts.push({ inlineData: { mimeType: attachedFile.mimeType, data: attachedFile.base64 } });
        if (prompt) userParts.push({ text: prompt });
        appendMessage('user', prompt, imageUrl);
        allChats[currentChatId].push({ role: 'user', parts: userParts });
    }

    function displayAiMessage(message) {
        appendMessage('model', message);
        if(currentChatId && allChats[currentChatId]) {
            allChats[currentChatId].push({ role: 'model', parts: [{ text: message }] });
        }
    }

    function appendMessage(role, text, imageUrl = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role === 'user' ? 'user' : 'ai'}`;
        if (imageUrl) { const img = document.createElement('img'); img.src = imageUrl; img.alt = "Lampiran"; messageDiv.appendChild(img); }
        if (text) {
            const contentContainer = document.createElement('div');
            contentContainer.innerHTML = (role !== 'user' && window.marked) ? marked.parse(text) : text;
            messageDiv.appendChild(contentContainer);
        }
        chatContainer.appendChild(contentContainer);
        scrollToBottom();
    }
    
    function appendLoadingIndicator() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message ai loading-indicator';
        loadingDiv.innerHTML = `<div class="gemini-loader"></div><span class="loading-text">Thinking...</span>`;
        chatContainer.appendChild(loadingDiv);
        scrollToBottom();
        return loadingDiv;
    }

    function displayAttachmentPreview(fileName, dataUrl) {
        attachmentPreview.innerHTML = `<div class="preview-item">${dataUrl.startsWith('data:image') ? `<img src="${dataUrl}" alt="Preview">`: ''}<span>${fileName}</span><button class="remove-attachment-btn" id="remove-attachment-btn">&times;</button></div>`;
        document.getElementById('remove-attachment-btn').addEventListener('click', clearAttachment);
    }
    
    function clearAttachment() {
        attachedFile = null;
        fileInput.value = '';
        attachmentPreview.innerHTML = '';
    }

    newChatBtn.addEventListener("click", (e) => {
        e.preventDefault();
        currentChatId = null;
        clearChatScreen();
        if (body.classList.contains("sidebar-open")) body.classList.remove("sidebar-open");
        setActiveHistoryItem(null);
    });

    function clearChatScreen() {
        chatContainer.innerHTML = '';
        chatContainer.appendChild(welcomeScreen);
        welcomeScreen.style.display = 'block';
        clearAttachment();
        document.querySelectorAll('#history-container .nav-item').forEach(item => item.classList.remove('active'));
    }

    function createHistoryItem(chatId, prompt) {
        const historyItem = document.createElement('a');
        historyItem.href = '#';
        historyItem.className = 'nav-item';
        historyItem.dataset.chatId = chatId;
        historyItem.innerHTML = `<svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M21 11.01L3 11v2h18zM3 16h12v2H3zM21 6H3v2.01L21 8z"></path></svg><span>${prompt.substring(0,20) + (prompt.length > 20 ? '...' : '')}</span>`;
        historyItem.addEventListener('click', (e) => { e.preventDefault(); loadChatHistory(chatId); });
        historyContainer.prepend(historyItem);
        setActiveHistoryItem(chatId);
    }

    function loadChatHistory(chatId) {
        if (!allChats[chatId]) return;
        currentChatId = chatId;
        clearChatScreen();
        welcomeScreen.style.display = 'none';
        allChats[chatId].forEach(message => {
            const text = message.parts.find(p => p.text)?.text || '';
            const imagePart = message.parts.find(p => p.inlineData);
            const imageUrl = imagePart ? `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` : null;
            appendMessage(message.role, text, imageUrl);
        });
        setActiveHistoryItem(chatId);
    }

    function setActiveHistoryItem(chatId) {
        document.querySelectorAll('#history-container .nav-item').forEach(item => {
            if (item.dataset.chatId === chatId) item.classList.add('active');
            else item.classList.remove('active');
        });
        if (chatId) {
            newChatBtn.classList.remove('active');
        } else {
            newChatBtn.classList.add('active');
        }
    }
});