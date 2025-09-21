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

    // --- State Aplikasi ---
    let conversationHistory = [];
    let attachedFile = null;
    let isRecording = false;
    let recognition;
    let timerInterval;
    let abortController;

    // --- Inisialisasi Speech Recognition ---
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
            voiceRecorderUI.style.display = 'none';
            inputWrapper.style.display = 'block';
        };

    } else {
        if(voiceBtn) voiceBtn.disabled = true;
        console.log("Speech Recognition tidak didukung di browser ini.");
    }
    
    // --- Helper Functions ---
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

    // --- Logika Tombol & Menu ---
    const toggleSidebar = () => body.classList.toggle("sidebar-open");
    if(menuToggleBtn) menuToggleBtn.addEventListener("click", toggleSidebar);
    if(sidebarOverlay) sidebarOverlay.addEventListener("click", toggleSidebar);
    
    if(moreOptionsBtn) moreOptionsBtn.addEventListener('click', (e) => { e.stopPropagation(); filePopupMenu.classList.toggle('active'); });
    window.addEventListener("click", () => {
        if(filePopupMenu) filePopupMenu.classList.remove('active');
    });

    if(attachFileBtn) attachFileBtn.addEventListener('click', () => { fileInput.removeAttribute('capture'); fileInput.setAttribute('accept', '*/*'); fileInput.click(); });
    if(attachCameraBtn) attachCameraBtn.addEventListener('click', () => { fileInput.setAttribute('capture', 'environment'); fileInput.setAttribute('accept', 'image/*'); fileInput.click(); });
    
    // --- Logika Perekaman Suara ---
    if(voiceBtn) voiceBtn.addEventListener('click', () => {
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

    if(deleteVoiceBtn) deleteVoiceBtn.addEventListener('click', () => {
        chatInput.value = '';
        voiceRecorderUI.style.display = 'none';
        inputWrapper.style.display = 'block';
    });

    if(sendVoiceBtn) sendVoiceBtn.addEventListener('click', () => {
        voiceRecorderUI.style.display = 'none';
        inputWrapper.style.display = 'block';
        handleSendMessage();
    });

    // --- Fungsi "New Chat" ---
    if(newChatBtn) newChatBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const messages = chatContainer.querySelectorAll('.message, .loading-indicator');
        messages.forEach(msg => msg.remove());
        if (welcomeScreen) { welcomeScreen.style.display = 'block'; }
        conversationHistory = [];
        clearAttachment();
        document.querySelectorAll('#history-container .nav-item').forEach(item => item.classList.remove('active'));
        if(body.classList.contains("sidebar-open")) toggleSidebar();
    });

    // --- Logika Penanganan File ---
    if(fileInput) fileInput.addEventListener('change', (event) => {
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
        if(filePopupMenu) filePopupMenu.classList.remove('active');
    });

    function displayAttachmentPreview(fileName, dataUrl) {
        if(!attachmentPreview) return;
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
        if(fileInput) fileInput.value = '';
        if(attachmentPreview) attachmentPreview.innerHTML = '';
    }

    // --- Auto-resize Textarea ---
    if(chatInput) chatInput.addEventListener('input', () => { chatInput.style.height = 'auto'; chatInput.style.height = `${chatInput.scrollHeight}px`; });

    // --- Fungsi Pengiriman Pesan ---
    const handleSendMessage = async () => {
        const prompt = chatInput.value.trim();
        if (!prompt && !attachedFile) return;

        if (welcomeScreen) welcomeScreen.style.display = 'none';
        if (conversationHistory.length === 0 && prompt) { createHistoryItem(prompt); }
        
        const userParts = [];
        if (attachedFile) userParts.push({ inlineData: { mimeType: attachedFile.mimeType, data: attachedFile.base64 } });
        if (prompt) userParts.push({ text: prompt });

        appendMessage('user', prompt, attachedFile ? `data:${attachedFile.mimeType};base64,${attachedFile.base64}` : null);
        conversationHistory.push({ role: 'user', parts: userParts });

        chatInput.value = '';
        chatInput.style.height = 'auto';
        clearAttachment();
        const loadingIndicator = appendLoadingIndicator();

        abortController = new AbortController();
        generateBtn.classList.add('generating');
        let seconds = 0;
        const generationTimer = setInterval(() => {
            seconds++;
            if(generateBtn.querySelector('.stop-timer')) {
                generateBtn.querySelector('.stop-timer').textContent = formatTime(seconds);
            }
        }, 1000);
        
        generateBtn.onclick = () => {
            abortController.abort();
            generateBtn.classList.remove('generating');
            clearInterval(generationTimer);
            generateBtn.onclick = handleSendMessage;
        };

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: abortController.signal,
                body: JSON.stringify({ history: conversationHistory }),
            });
            if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
            const result = await response.json();
            
            loadingIndicator.remove();
            appendMessage('model', result.data);
            conversationHistory.push({ role: 'model', parts: [{ text: result.data }] });
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Fetch aborted by user.');
                loadingIndicator.remove();
                appendMessage('model', 'Respon dihentikan. Ada lagi yang bisa dibantu?');
            } else {
                console.error("Error fetching AI response:", error);
                loadingIndicator.remove();
                appendMessage('model', 'Maaf, terjadi kesalahan. 🤖 Mari kita coba lagi.');
            }
        } finally {
            generateBtn.classList.remove('generating');
            clearInterval(generationTimer);
            generateBtn.onclick = handleSendMessage;
        }
    };

    // --- Event Listener Kirim ---
    if(generateBtn) generateBtn.onclick = handleSendMessage;
    if(chatInput) chatInput.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } });

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
        if(chatContainer) chatContainer.appendChild(messageDiv);
        scrollToBottom();
    }

    // --- Fungsi Lainnya ---
    function appendLoadingIndicator() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-indicator';
        loadingDiv.innerHTML = `<div class="spinner"></div>`;
        if(chatContainer) chatContainer.appendChild(loadingDiv);
        scrollToBottom();
        return loadingDiv;
    }
    
    function createHistoryItem(prompt) {
        if(!historyContainer) return;
        document.querySelectorAll('#history-container .nav-item').forEach(item => item.classList.remove('active'));
        const historyItem = document.createElement('a');
        historyItem.href = '#';
        historyItem.className = 'nav-item active';
        historyItem.innerHTML = `<svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M21 11.01L3 11v2h18zM3 16h12v2H3zM21 6H3v2.01L21 8z"></path></svg><span>${prompt.substring(0, 20) + (prompt.length > 20 ? '...' : '')}</span>`;
        historyContainer.prepend(historyItem);
    }
    
    function scrollToBottom() {
        if(chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
    }
});