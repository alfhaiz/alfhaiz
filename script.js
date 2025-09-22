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
    const agentLogConsole = document.getElementById('agent-log-console');

    // --- State Aplikasi ---
    let allChats = {};
    let currentChatId = null;
    let currentModel = 'gemini-1.5-pro-latest';
    let attachedFile = null;
    let isAgentMode = false;
    let recognition;
    let isRecording = false;
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
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            chatInput.value = finalTranscript + interimTranscript;
            autoResizeTextarea();
        };

        recognition.onend = () => {
            isRecording = false;
            clearInterval(timerInterval);
            recorderStatus.style.display = 'none';
            recorderActions.style.display = 'flex';
        };

        recognition.onerror = (event) => {
            console.error("Speech Recognition Error:", event.error);
            isRecording = false;
            clearInterval(timerInterval);
            voiceRecorderUI.style.display = 'none';
            inputWrapper.style.display = 'flex';
        };
    } else {
        if (voiceBtn) voiceBtn.disabled = true;
    }

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const createVisualizerBars = () => {
        waveformVisualizer.innerHTML = '';
        for (let i = 0; i < 20; i++) {
            const bar = document.createElement('div');
            bar.className = 'waveform-bar';
            bar.style.animationDelay = `${Math.random() * 0.5}s`;
            bar.style.animationDuration = `${0.8 + Math.random() * 0.7}s`;
            waveformVisualizer.appendChild(bar);
        }
    };
    
    const showNotification = (message) => {
        notificationToast.textContent = message;
        notificationToast.classList.add('show');
        setTimeout(() => {
            notificationToast.classList.remove('show');
        }, 3000);
    };

    const scrollToBottom = () => {
        if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
    };
    
    const autoResizeTextarea = () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = `${chatInput.scrollHeight}px`;
    };

    // --- Event Listeners UI Dasar ---
    menuToggleBtn.addEventListener("click", () => body.classList.toggle("sidebar-open"));
    sidebarOverlay.addEventListener("click", () => body.classList.remove("sidebar-open"));
    moreOptionsBtn.addEventListener('click', (e) => { e.stopPropagation(); filePopupMenu.classList.toggle('active'); });
    window.addEventListener("click", () => {
        filePopupMenu.classList.remove('active');
        modelModal.classList.remove('active');
    });
    attachFileBtn.addEventListener('click', () => { fileInput.removeAttribute('capture'); fileInput.setAttribute('accept', '*/*'); fileInput.click(); });
    attachCameraBtn.addEventListener('click', () => { fileInput.setAttribute('capture', 'environment'); fileInput.setAttribute('accept', 'image/*'); fileInput.click(); });
    voiceBtn.addEventListener('click', () => {
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
    deleteVoiceBtn.addEventListener('click', () => {
        chatInput.value = '';
        voiceRecorderUI.style.display = 'none';
        inputWrapper.style.display = 'flex';
    });
    sendVoiceBtn.addEventListener('click', () => {
        voiceRecorderUI.style.display = 'none';
        inputWrapper.style.display = 'flex';
        handleSendMessage();
    });
    modelSelectorBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        modelModal.classList.add('active');
    });
    modelOptions.forEach(option => {
        option.addEventListener('click', () => {
            currentModel = option.dataset.model;
            modelDisplayName.textContent = option.dataset.displayName;
            document.querySelector('.model-option.selected').classList.remove('selected');
            option.classList.add('selected');
            modelModal.classList.remove('active');
            showNotification(`${option.dataset.displayName.toUpperCase()} READY`);
        });
    });
    fileInput.addEventListener('change', (event) => {
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
        filePopupMenu.classList.remove('active');
    });
    chatInput.addEventListener('input', autoResizeTextarea);

    // --- Logika Mode Agen ---
    agentModeBtn.addEventListener('click', () => {
        isAgentMode = !isAgentMode;
        agentModeBtn.classList.toggle('active');
        if (isAgentMode) {
            chatInput.placeholder = 'Perintahkan saya untuk membuat sesuatu...';
            chatContainer.style.display = 'none';
            welcomeScreen.style.display = 'none'; // Pastikan welcome screen juga hilang
            livePreviewContainer.style.display = 'flex';
            // Kosongkan log dan iframe saat beralih
            agentLogConsole.innerHTML = '';
            livePreviewIframe.srcdoc = '';
            livePreviewIframe.style.opacity = '0';
        } else {
            chatInput.placeholder = 'Ask me anything...';
            chatContainer.style.display = 'flex';
            if (!chatContainer.querySelector('.message')) {
                welcomeScreen.style.display = 'block';
            }
            livePreviewContainer.style.display = 'none';
        }
    });

    // --- Fungsi Pengiriman Pesan Inti ---
    const handleSendMessage = async () => {
        const prompt = chatInput.value.trim();
        if (!prompt && !attachedFile) return;

        if (isAgentMode) {
            await runAgentMode(prompt);
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
        generateBtn.onclick = () => abortController.abort(); // Fungsionalitas tombol stop

        try {
            const response = await callApi("chat", allChats[currentChatId]);
            loadingIndicator.remove();
            displayAiMessage(response.data);
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
    
    // --- Alur Mode Agen ---
    async function runAgentMode(prompt) {
        generateBtn.disabled = true;
        agentLogConsole.innerHTML = '';
        livePreviewIframe.style.opacity = '0';
        M.style.display = 'flex'; // Tampilkan konsol log
    
        const logLines = [
            "<span class='tag'>[ Menganalisis ]</span> Menganalisis permintaan Anda...",
            "<span class='tag'>[ Merancang ]</span> Merancang struktur dasar HTML...",
            "<span class='tag'>[ Menulis Kode ]</span> Menulis CSS & JavaScript...",
            "<span class='tag'>[ Finalisasi ]</span> Merender kode dan menyelesaikan..."
        ];
    
        const runLogAnimation = async () => {
            for (const lineText of logLines) {
                await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 500));
                const line = document.createElement('div');
                line.className = 'log-line';
                line.innerHTML = lineText;
                agentLogConsole.appendChild(line);
                agentLogConsole.scrollTop = agentLogConsole.scrollHeight;
            }
        };
    
        const fetchCode = callApi("agent", [{ role: 'user', parts: [{ text: prompt }] }]);
    
        try {
            const [_, result] = await Promise.all([runLogAnimation(), fetchCode]);
    
            await new Promise(resolve => setTimeout(resolve, 500));
            const doneLine = document.createElement('div');
            doneLine.className = 'log-line';
            doneLine.innerHTML = "<span class='tag'>[ Selesai ]</span> Proses building selesai!";
            agentLogConsole.appendChild(doneLine);
    
            setTimeout(() => {
                agentLogConsole.style.display = 'none';
                livePreviewIframe.srcdoc = result.data;
                livePreviewIframe.style.opacity = '1';
            }, 1000);
    
        } catch (error) {
            console.error("Agent mode error:", error);
            agentLogConsole.innerHTML = `<div class='log-line'><span class='tag'>[ ERROR ]</span> Gagal mem-build, coba lagi.</div>`;
        } finally {
            generateBtn.disabled = false;
        }
    }

    // --- Fungsi Helper untuk API dan Tampilan ---
    async function callApi(mode, history) {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: abortController ? abortController.signal : null,
            body: JSON.stringify({ history, model: currentModel, mode })
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
        if (attachedFile) {
            userParts.push({ inlineData: { mimeType: attachedFile.mimeType, data: attachedFile.base64 } });
        }
        if (prompt) {
            userParts.push({ text: prompt });
        }
        
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
        
        if (imageUrl) {
            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = "Lampiran";
            messageDiv.appendChild(img);
        }

        if (text) {
            const contentContainer = document.createElement('div');
            if (role !== 'user' && window.marked) {
                contentContainer.innerHTML = marked.parse(text);
            } else {
                contentContainer.textContent = text;
            }
            messageDiv.appendChild(contentContainer);
        }
        
        chatContainer.appendChild(messageDiv);
        scrollToBottom();
    }
    
    function appendLoadingIndicator() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message ai loading-indicator';
        const loadingPhrases = ["Tunggu sebentar...", "Alfhaiz sedang berfikir...", "Menyusun jawaban..."];
        loadingDiv.innerHTML = `<div class="gemini-loader"></div><span class="loading-text">${loadingPhrases[0]}</span>`;
        chatContainer.appendChild(loadingDiv);
        scrollToBottom();
        
        let phraseIndex = 1;
        const textInterval = setInterval(() => {
            const loadingText = loadingDiv.querySelector('.loading-text');
            if(loadingText) loadingText.textContent = loadingPhrases[phraseIndex % loadingPhrases.length];
            phraseIndex++;
        }, 2500);

        // Return the element so it can be removed
        return loadingDiv;
    }
    
    // --- Fungsi Sistem History Chat ---
    newChatBtn.addEventListener("click", (e) => {
        e.preventDefault();
        currentChatId = null;
        clearChatScreen();
        if (body.classList.contains("sidebar-open")) {
            body.classList.remove("sidebar-open");
        }
        setActiveHistoryItem(null);
    });

    function clearChatScreen() {
        chatContainer.innerHTML = ''; // Clear all messages and indicators
        welcomeScreen.style.display = 'block';
        clearAttachment();
        document.querySelectorAll('#history-container .nav-item').forEach(item => item.classList.remove('active'));
    }
    
    function displayAttachmentPreview(fileName, dataUrl) {
        attachmentPreview.innerHTML = `<div class="preview-item">${dataUrl.startsWith('data:image')?`<img src="${dataUrl}" alt="Preview">`:''}<span>${fileName}</span><button class="remove-attachment-btn" id="remove-attachment-btn">&times;</button></div>`;
        document.getElementById('remove-attachment-btn').addEventListener('click', clearAttachment);
    }
    
    function clearAttachment() {
        attachedFile = null;
        fileInput.value = '';
        attachmentPreview.innerHTML = '';
    }

    function createHistoryItem(chatId, prompt) {
        const historyItem = document.createElement('a');
        historyItem.href = '#';
        historyItem.className = 'nav-item';
        historyItem.dataset.chatId = chatId;
        historyItem.innerHTML = `<svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M21 11.01L3 11v2h18zM3 16h12v2H3zM21 6H3v2.01L21 8z"></path></svg><span>${prompt.substring(0, 20) + (prompt.length > 20 ? '...' : '')}</span>`;
        historyItem.addEventListener('click', (e) => {
            e.preventDefault();
            loadChatHistory(chatId);
        });
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
});