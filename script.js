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
    const agentModeBtn = document.getElementById('agent-mode-btn');
    const livePreviewContainer = document.getElementById('live-preview-container');
    const livePreviewIframe = document.getElementById('live-preview-iframe');

    // --- State Aplikasi ---
    let allChats = {};
    let currentChatId = null;
    let currentModel = 'gemini-2.0-flash';
    let attachedFile = null;
    let isAgentMode = false;
    let isRecording = false;
    let recognition;
    let timerInterval;
    let abortController;

    // --- Inisialisasi Speech Recognition & Helpers ---
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
        };
        recognition.onend = () => {
            isRecording = false;
            clearInterval(timerInterval);
            if (recorderStatus) recorderStatus.style.display = 'none';
            if (recorderActions) recorderActions.style.display = 'flex';
        };
        recognition.onerror = (event) => {
            console.error("Speech Recognition Error:", event.error);
            isRecording = false;
            clearInterval(timerInterval);
            if (voiceRecorderUI) voiceRecorderUI.style.display = 'none';
            if (inputWrapper) inputWrapper.style.display = 'block';
        };
    } else {
        if (voiceBtn) voiceBtn.disabled = true;
        console.log("Speech Recognition tidak didukung di browser ini.");
    }
    const formatTime = (seconds) => { const minutes = Math.floor(seconds / 60); const secs = seconds % 60; return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`; };
    const createVisualizerBars = () => {
        if (!waveformVisualizer) return;
        waveformVisualizer.innerHTML = '';
        for (let i = 0; i < 20; i++) {
            const bar = document.createElement('div');
            bar.className = 'waveform-bar';
            bar.style.animationDelay = `${Math.random() * 0.5}s`;
            bar.style.animationDuration = `${0.8 + Math.random() * 0.7}s`;
            waveformVisualizer.appendChild(bar);
        }
    };

    // --- Logika Tombol & Menu ---
    const toggleSidebar = () => body.classList.toggle("sidebar-open");
    if (menuToggleBtn) menuToggleBtn.addEventListener("click", toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener("click", toggleSidebar);
    if (moreOptionsBtn) moreOptionsBtn.addEventListener('click', (e) => { e.stopPropagation(); filePopupMenu.classList.toggle('active'); });
    window.addEventListener("click", () => {
        if (filePopupMenu) filePopupMenu.classList.remove('active');
        if (modelModal) modelModal.classList.remove('active');
    });
    if (attachFileBtn) attachFileBtn.addEventListener('click', () => { fileInput.removeAttribute('capture'); fileInput.setAttribute('accept', '*/*'); fileInput.click(); });
    if (attachCameraBtn) attachCameraBtn.addEventListener('click', () => { fileInput.setAttribute('capture', 'environment'); fileInput.setAttribute('accept', 'image/*'); fileInput.click(); });
    if (voiceBtn) voiceBtn.addEventListener('click', () => {
        if (!recognition) return;
        if (isRecording) {
            recognition.stop();
        } else {
            isRecording = true;
            chatInput.value = '';
            recognition.start();
            voiceRecorderUI.style.display = 'flex';
            inputWrapper.style.display = 'none';
            recorderStatus.style.display = 'flex';
            recorderActions.style.display = 'none';
            createVisualizerBars();
            let seconds = 0;
            recorderTimer.textContent = '00:00';
            timerInterval = setInterval(() => {
                seconds++;
                recorderTimer.textContent = formatTime(seconds);
            }, 1000);
        }
    });
    if (deleteVoiceBtn) deleteVoiceBtn.addEventListener('click', () => {
        chatInput.value = '';
        voiceRecorderUI.style.display = 'none';
        inputWrapper.style.display = 'block';
    });
    if (sendVoiceBtn) sendVoiceBtn.addEventListener('click', () => {
        voiceRecorderUI.style.display = 'none';
        inputWrapper.style.display = 'block';
        handleSendMessage();
    });
    if (modelSelectorBtn) modelSelectorBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        modelModal.classList.add('active');
    });
    modelOptions.forEach(option => {
        option.addEventListener('click', () => {
            currentModel = option.dataset.model;
            const displayName = option.dataset.displayName;
            modelDisplayName.textContent = displayName;
            modelOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            modelModal.classList.remove('active');
            if (displayName.includes('3.5')) {
                showNotification(`${displayName.toUpperCase()} READY`);
            }
        });
    });
    function showNotification(message) {
        notificationToast.textContent = message;
        notificationToast.classList.add('show');
        setTimeout(() => {
            notificationToast.classList.remove('show');
        }, 3000);
    }

    // --- Logika Agent Mode ---
    if(agentModeBtn) agentModeBtn.addEventListener('click', () => {
        isAgentMode = !isAgentMode;
        body.classList.toggle('dark-mode');
        agentModeBtn.classList.toggle('active');

        if(isAgentMode) {
            chatInput.placeholder = 'Perintahkan saya untuk membuat sesuatu...';
            welcomeScreen.style.display = 'none';
            livePreviewContainer.style.display = 'flex';
        } else {
            chatInput.placeholder = 'Ask me anything...';
            livePreviewContainer.style.display = 'none';
            if (!chatContainer.querySelector('.message')) {
                welcomeScreen.style.display = 'block';
            }
        }
    });

    // --- Logika Sistem History Chat ---
    if (newChatBtn) newChatBtn.addEventListener("click", (e) => {
        e.preventDefault();
        currentChatId = null;
        clearChatScreen();
        if (body.classList.contains("sidebar-open")) toggleSidebar();
        newChatBtn.classList.add('active');
    });

    function clearChatScreen() {
        const messages = chatContainer.querySelectorAll('.message, .loading-indicator');
        messages.forEach(msg => msg.remove());
        if (welcomeScreen) welcomeScreen.style.display = 'block';
        clearAttachment();
        document.querySelectorAll('#history-container .nav-item').forEach(item => item.classList.remove('active'));
    }

    // --- Logika Penanganan File ---
    if (fileInput) fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result;
            const base64Data = dataUrl.split(',')[1];
            attachedFile = { mimeType: file.type, base64: base64Data };
            displayAttachmentPreview(file.name, dataUrl);
        };
        reader.readAsDataURL(file);
        if (filePopupMenu) filePopupMenu.classList.remove('active');
    });

    function displayAttachmentPreview(fileName, dataUrl) {
        if (!attachmentPreview) return;
        attachmentPreview.innerHTML = `
            <div class="preview-item">
                ${dataUrl.startsWith('data:image') ? `<img src="${dataUrl}" alt="Preview">` : ''}
                <span>${fileName}</span>
                <button class="remove-attachment-btn" id="remove-attachment-btn">&times;</button>
            </div>`;
        document.getElementById('remove-attachment-btn').addEventListener('click', clearAttachment);
    }

    function clearAttachment() {
        attachedFile = null;
        if (fileInput) fileInput.value = '';
        if (attachmentPreview) attachmentPreview.innerHTML = '';
    }

    // --- Auto-resize Textarea ---
    if (chatInput) chatInput.addEventListener('input', () => { chatInput.style.height = 'auto'; chatInput.style.height = `${chatInput.scrollHeight}px`; });

    // --- Fungsi Pengiriman Pesan ---
    const handleSendMessage = async () => {
        const prompt = chatInput.value.trim();
        if (!prompt && !attachedFile) return;
        if (welcomeScreen) welcomeScreen.style.display = 'none';

        if (!currentChatId) {
            currentChatId = `chat_${Date.now()}`;
            allChats[currentChatId] = [];
            createHistoryItem(currentChatId, prompt || "Chat with attachment");
        }

        const userParts = [];
        if (attachedFile) userParts.push({ inlineData: { mimeType: attachedFile.mimeType, data: attachedFile.base64 } });
        if (prompt) userParts.push({ text: prompt });

        appendMessage('user', prompt, attachedFile ? `data:${attachedFile.mimeType};base64,${attachedFile.base64}` : null);
        allChats[currentChatId].push({ role: 'user', parts: userParts });

        chatInput.value = '';
        chatInput.style.height = 'auto';
        clearAttachment();
        const loadingState = appendLoadingIndicator();

        abortController = new AbortController();
        generateBtn.classList.add('generating');
        let seconds = 0;
        const generationTimer = setInterval(() => {
            seconds++;
            if (generateBtn.querySelector('.stop-timer')) generateBtn.querySelector('.stop-timer').textContent = formatTime(seconds);
        }, 1000);

        generateBtn.onclick = () => {
            abortController.abort();
        };

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: abortController.signal,
                body: JSON.stringify({
                    history: allChats[currentChatId],
                    model: currentModel,
                    mode: isAgentMode ? 'agent' : 'chat'
                }),
            });
            if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
            const result = await response.json();

            clearInterval(loadingState.intervalId);
            const loadingTextElement = loadingState.element.querySelector('.loading-text');
            if (loadingTextElement) loadingTextElement.textContent = "Tentu, ini dia!";
            
            setTimeout(() => {
                loadingState.element.remove();
                if (isAgentMode) {
                    livePreviewIframe.srcdoc = result.data;
                    appendMessage('model', 'Tentu, proses building selesai. Berikut hasilnya.');
                } else {
                    appendMessage('model', result.data);
                }
                allChats[currentChatId].push({ role: 'model', parts: [{ text: result.data }] });
            }, 700);

        } catch (error) {
            clearInterval(loadingState.intervalId);
            loadingState.element.remove();
            if (error.name === 'AbortError') {
                appendMessage('model', 'Respon dihentikan.');
            } else {
                console.error("Error fetching AI response:", error);
                appendMessage('model', 'Maaf, terjadi kesalahan. 🤖');
            }
        } finally {
            generateBtn.classList.remove('generating');
            clearInterval(generationTimer);
            generateBtn.onclick = handleSendMessage;
        }
    };

    // --- Event Listener Kirim ---
    if (generateBtn) generateBtn.onclick = handleSendMessage;
    if (chatInput) chatInput.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } });

    // --- Fungsi Tampilan Pesan ---
    function appendMessage(role, text, imageUrl = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role === 'user' ? 'user' : 'ai'}`;
        if (imageUrl) {
            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = "Lampiran";
            messageDiv.appendChild(img);
        }
        if (text) {
            const p = document.createElement('p');
            if (role !== 'user' && window.marked) {
                p.innerHTML = marked.parse(text.replace(/</g, "&lt;").replace(/>/g, "&gt;"));
            } else {
                p.textContent = text;
            }
            messageDiv.appendChild(p);
        }
        if (chatContainer) chatContainer.appendChild(messageDiv);
        scrollToBottom();
    }

    // --- Fungsi Loading Indicator ---
    function appendLoadingIndicator() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-indicator';
        const loadingPhrases = ["Tunggu sebentar...", "Alfhaiz sedang berfikir...", "Menyusun jawaban..."];
        const loaderIcon = document.createElement('div');
        loaderIcon.className = 'gemini-loader';
        const loadingText = document.createElement('span');
        loadingText.className = 'loading-text';
        loadingText.textContent = loadingPhrases[0];
        loadingDiv.appendChild(loaderIcon);
        loadingDiv.appendChild(loadingText);
        if (chatContainer) chatContainer.appendChild(loadingDiv);
        scrollToBottom();
        let phraseIndex = 1;
        const textInterval = setInterval(() => {
            loadingText.textContent = loadingPhrases[phraseIndex % loadingPhrases.length];
            phraseIndex++;
        }, 2000);
        return { element: loadingDiv, intervalId: textInterval };
    }

    // --- Fungsi Sistem History Chat ---
    function createHistoryItem(chatId, prompt) {
        if (!historyContainer) return;
        const historyItem = document.createElement('a');
        historyItem.href = '#';
        historyItem.className = 'nav-item';
        historyItem.dataset.chatId = chatId;
        historyItem.innerHTML = `<svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M21 11.01L3 11v2h18zM3 16h12v2H3zM21 6H3v2.01L21 8z"></path></svg><span>${prompt.substring(0, 20) + (prompt.length > 20 ? '...' : '')}</span>`;
        historyItem.addEventListener('click', (e) => { e.preventDefault(); loadChatHistory(chatId); });
        historyContainer.prepend(historyItem);
        setActiveHistoryItem(chatId);
    }

    function loadChatHistory(chatId) {
        if (!allChats[chatId]) return;
        currentChatId = chatId;
        clearChatScreen();
        if (welcomeScreen) welcomeScreen.style.display = 'none';
        const chatHistory = allChats[chatId];
        chatHistory.forEach(message => {
            const text = message.parts.find(p => p.text)?.text || '';
            const imagePart = message.parts.find(p => p.inlineData);
            const imageUrl = imagePart ? `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` : null;
            appendMessage(message.role, text, imageUrl);
        });
        setActiveHistoryItem(chatId);
    }

    function setActiveHistoryItem(chatId) {
        document.querySelectorAll('#history-container .nav-item').forEach(item => {
            if (item.dataset.chatId === chatId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        if (chatId) {
            newChatBtn.classList.remove('active');
        } else {
            newChatBtn.classList.add('active');
        }
    }

    function scrollToBottom() { if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight; }
});