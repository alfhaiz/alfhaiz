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
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const darkModeIcon = document.getElementById('dark-mode-icon');
    const imageLoadingOverlay = document.getElementById('image-loading-overlay'); // Elemen loading baru

    // --- State Aplikasi ---
    let allChats = {};
    let currentChatId = null;
    let currentModel = 'gemini-2.5-flash'; // Model default
    let attachedFile = null;
    let isRecording = false;
    let recognition;
    let timerInterval;
    let abortController;
    const IMAGE_MODEL_ID = 'gemini-2.5-flash-image-preview'; // ID untuk model gambar

    // --- Inisialisasi Speech Recognition & Helpers (Kode Asli) ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'id-ID';
        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';
            for (let i = event.results.length - 1; i >= event.resultIndex; --i) {
                 if (event.results[i].isFinal) finalTranscript = event.results[i][0].transcript + finalTranscript;
                 else interimTranscript = event.results[i][0].transcript + interimTranscript;
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
            if (inputWrapper) inputWrapper.style.display = 'flex';
            showNotification(`Error Rekaman Suara: ${event.error}.`, true);
        };
    } else {
        if (voiceBtn) voiceBtn.disabled = true;
        console.warn("Speech Recognition tidak didukung di browser ini.");
        showNotification("Rekaman Suara tidak didukung di browser ini. ");
    }
    const formatTime = (seconds) => { const minutes = Math.floor(seconds / 60); const secs = seconds % 60; return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`; };
    const createVisualizerBars = () => { if (!waveformVisualizer) return; waveformVisualizer.innerHTML = ''; for (let i = 0; i < 20; i++) { const bar = document.createElement('div'); bar.className = 'waveform-bar'; bar.style.animationDelay = `${Math.random() * 0.5}s`; bar.style.animationDuration = `${0.8 + Math.random() * 0.7}s`; waveformVisualizer.appendChild(bar); } };

    // --- Logika Dark Mode (Kode Asli yang Diperbaiki) ---
    const applyTheme = (theme) => {
        if (theme === 'dark') {
            body.classList.add('dark-mode');
            if (darkModeIcon) darkModeIcon.setAttribute('d', 'M12 2.75a9.25 9.25 0 100 18.5 9.25 9.25 0 000-18.5zM12 4.25a7.75 7.75 0 100 15.5 7.75 7.75 0 000-15.5zM12 6a6 6 0 00-6 6h12a6 6 0 00-6-6z');
        } else {
            body.classList.remove('dark-mode');
            if (darkModeIcon) darkModeIcon.setAttribute('d', 'M12 2a1 1 0 011 1v2a1 1 0 11-2 0V3a1 1 0 011-1zm0 18a1 1 0 01-1 1v2a1 1 0 112 0v-2a1 1 0 01-1-1zm6.36-14.86a1 1 0 01-.71-.29l-1.41-1.41a1 1 0 011.41-1.41l1.41 1.41a1 1 0 01-.71 1.71zm-12.72 12.72a1 1 0 01-.71-.29l-1.41-1.41a1 1 0 011.41-1.41l1.41 1.41a1 1 0 01-.71 1.71zm-2.83-8.48a1 1 0 01-.71-.29L3.51 9.07a1 1 0 011.41-1.41l1.41 1.41a1 1 0 01-.71 1.71zm12.72 12.72a1 1 0 01-.71-.29l-1.41-1.41a1 1 0 011.41-1.41l1.41 1.41a1 1 0 01-.71 1.71zM12 7a5 5 0 100 10 5 5 0 000-10zm0 8a3 3 0 110-6 3 3 0 010 6z');
        }
    };
    const currentTheme = localStorage.getItem('theme') || 'light';
    applyTheme(currentTheme);
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            const newTheme = body.classList.contains('dark-mode') ? 'light' : 'dark';
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
        });
    }

    // --- Logika Tombol & Menu (Kode Asli) ---
    const toggleSidebar = () => body.classList.toggle("sidebar-open");
    if (menuToggleBtn) menuToggleBtn.addEventListener("click", toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener("click", toggleSidebar);
    if (moreOptionsBtn) moreOptionsBtn.addEventListener('click', (e) => { e.stopPropagation(); filePopupMenu.classList.toggle('active'); });
    window.addEventListener("click", () => { if (filePopupMenu) filePopupMenu.classList.remove('active'); if (modelModal) modelModal.classList.remove('active'); });
    if (attachFileBtn) attachFileBtn.addEventListener('click', () => { fileInput.removeAttribute('capture'); fileInput.setAttribute('accept', '*/*'); fileInput.click(); });
    if (attachCameraBtn) attachCameraBtn.addEventListener('click', () => { fileInput.setAttribute('capture', 'environment'); fileInput.setAttribute('accept', 'image/*'); fileInput.click(); });
    if (voiceBtn) voiceBtn.addEventListener('click', () => { if (!recognition) return; if (isRecording) { recognition.stop(); } else { isRecording = true; chatInput.value = ''; recognition.start(); voiceRecorderUI.style.display = 'flex'; inputWrapper.style.display = 'none'; recorderStatus.style.display = 'flex'; recorderActions.style.display = 'none'; createVisualizerBars(); let seconds = 0; recorderTimer.textContent = '00:00'; timerInterval = setInterval(() => { seconds++; recorderTimer.textContent = formatTime(seconds); }, 1000); } });
    if (deleteVoiceBtn) deleteVoiceBtn.addEventListener('click', () => { chatInput.value = ''; voiceRecorderUI.style.display = 'none'; inputWrapper.style.display = 'flex'; if(isRecording) recognition.stop(); });
    if (sendVoiceBtn) sendVoiceBtn.addEventListener('click', () => { voiceRecorderUI.style.display = 'none'; inputWrapper.style.display = 'flex'; if(isRecording) recognition.stop(); handleSendMessage(); });
    
    // --- Logika Pemilihan Model (Baru) ---
    if (modelSelectorBtn) modelSelectorBtn.addEventListener('click', (e) => { e.stopPropagation(); modelModal.classList.add('active'); });
    modelOptions.forEach(option => {
        option.addEventListener('click', () => {
            currentModel = option.dataset.model;
            const displayName = option.dataset.displayName;
            modelDisplayName.textContent = displayName;
            modelOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            modelModal.classList.remove('active');

            if (currentModel === IMAGE_MODEL_ID) {
                chatInput.placeholder = 'Describe an image you want to create...';
                moreOptionsBtn.style.display = 'none';
                voiceBtn.style.display = 'none';
            } else {
                chatInput.placeholder = 'Ask me anything...';
                moreOptionsBtn.style.display = 'flex';
                voiceBtn.style.display = 'flex';
            }
            showNotification(`${displayName.toUpperCase()} READY`);
        });
    });

    function showNotification(message, isError = false) {
        notificationToast.textContent = message;
        notificationToast.style.backgroundColor = isError ? '#EF4444' : 'var(--text-primary)'; // Logika yang benar
        notificationToast.classList.add('show');
        setTimeout(() => { notificationToast.classList.remove('show'); }, 3000);
    }

    // --- Logika Penanganan File (Kode Asli) ---
    if (fileInput) fileInput.addEventListener('change', (event) => { const file = event.target.files[0]; if (!file) return; if (file.size > 5 * 1024 * 1024) { showNotification("Ukuran file maksimal adalah 5MB. ", true); fileInput.value = ''; return; } const reader = new FileReader(); reader.onloadend = () => { const dataUrl = reader.result; const base64Data = dataUrl.split(',')[1]; attachedFile = { mimeType: file.type, base64: base64Data }; displayAttachmentPreview(file.name, dataUrl); }; reader.readAsDataURL(file); if (filePopupMenu) filePopupMenu.classList.remove('active'); });
    function displayAttachmentPreview(fileName, dataUrl) { if (!attachmentPreview) return; attachmentPreview.innerHTML = `<div class="preview-item">${dataUrl.startsWith('data:image') ? `<img src="${dataUrl}" alt="Preview">` : ''}<span>${fileName}</span><button class="remove-attachment-btn" id="remove-attachment-btn">&times;</button></div>`; document.getElementById('remove-attachment-btn').addEventListener('click', clearAttachment); }
    function clearAttachment() { attachedFile = null; if (fileInput) fileInput.value = ''; if (attachmentPreview) attachmentPreview.innerHTML = ''; }

    // --- Auto-resize Textarea ---
    if (chatInput) chatInput.addEventListener('input', () => { chatInput.style.height = 'auto'; chatInput.style.height = `${chatInput.scrollHeight}px`; });

    // --- Fungsi Pengiriman Pesan (Dispatcher) ---
    const handleSendMessage = async () => {
        const prompt = chatInput.value.trim();
        if (currentModel !== IMAGE_MODEL_ID && !prompt && !attachedFile) return;
        if (currentModel === IMAGE_MODEL_ID && !prompt) return;

        if (welcomeScreen) welcomeScreen.style.display = 'none';

        if (currentModel === IMAGE_MODEL_ID) {
            handleImageGeneration(prompt);
        } else {
            handleTextGeneration(prompt);
        }

        chatInput.value = '';
        chatInput.style.height = 'auto';
    };

    // --- Logika Generate Gambar (Baru) ---
    const handleImageGeneration = async (prompt) => {
        appendMessage('user', prompt);
        imageLoadingOverlay.style.display = 'flex';

        try {
            const response = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, model: currentModel }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Gagal membuat gambar dari server');
            }

            const result = await response.json();
            appendMessage('model', `Here is your masterpiece for: "${prompt}"`, result.imageUrl);

        } catch (error) {
            console.error("Error generating image:", error);
            appendMessage('model', `Maaf, saya gagal membuat gambar.  Error: ${error.message}`);
            showNotification(error.message, true);
        } finally {
            imageLoadingOverlay.style.display = 'none';
        }
    };
    
    // --- Logika Generate Teks (Direfaktor dari kode asli) ---
    const handleTextGeneration = async (prompt) => {
        if (!currentChatId || !allChats[currentChatId]) {
            currentChatId = `chat_${Date.now()}`;
            allChats[currentChatId] = [];
            createHistoryItem(currentChatId, prompt || "Chat dengan lampiran");
        }
        
        const userParts = [];
        if (attachedFile) userParts.push({ inlineData: { mimeType: attachedFile.mimeType, data: attachedFile.base64 } });
        if (prompt) userParts.push({ text: prompt });
        
        appendMessage('user', prompt, attachedFile ? `data:${attachedFile.mimeType};base64,${attachedFile.base64}` : null);
        allChats[currentChatId].push({ role: 'user', parts: userParts });
        clearAttachment();
        
        const loadingState = appendLoadingIndicator();
        abortController = new AbortController();
        generateBtn.classList.add('generating');
        let seconds = 0;
        const generationTimer = setInterval(() => { seconds++; if (generateBtn.querySelector('.stop-timer')) generateBtn.querySelector('.stop-timer').textContent = formatTime(seconds); }, 1000);
        generateBtn.onclick = () => { abortController.abort(); showNotification("Generasi dihentikan. "); };

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: abortController.signal,
                body: JSON.stringify({ history: allChats[currentChatId], model: currentModel }),
            });
            if (!response.ok) { const errorData = await response.json(); throw new Error(`Server error: ${errorData.error || response.statusText}`); }
            const result = await response.json();
            
            clearInterval(loadingState.intervalId);
            loadingState.element.remove();

            const aiMessage = result.data;
            const sourceLinks = result.sources || [];
            appendMessage('model', aiMessage, null, sourceLinks);
            allChats[currentChatId].push({ role: 'model', parts: [{ text: aiMessage }] });

        } catch (error) {
            clearInterval(loadingState.intervalId);
            loadingState.element.remove();
            if (error.name === 'AbortError') { appendMessage('model', 'Respon dihentikan. '); } 
            else { console.error("Error fetching AI response:", error); appendMessage('model', `Maaf, terjadi kesalahan.  Error: ${error.message}`); showNotification(`Terjadi kesalahan: ${error.message}`, true); }
        } finally {
            generateBtn.classList.remove('generating');
            clearInterval(generationTimer);
            generateBtn.onclick = handleSendMessage;
        }
    };

    // --- Event Listener Kirim ---
    if (generateBtn) generateBtn.onclick = handleSendMessage;
    if (chatInput) chatInput.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } });

    // --- Fungsi Tampilan Pesan (Upgrade) ---
    function appendMessage(role, text, imageUrl = null, sourceLinks = []) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role === 'user' ? 'user' : 'ai'}`;
        
        // --- LOGIKA BARU UNTUK GAMBAR YANG DI-GENERATE ---
        if (imageUrl && role === 'model') {
            const container = document.createElement('div');
            container.className = 'generated-image-container';
            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = text || "Generated Image";

            const downloadButton = document.createElement('a');
            downloadButton.href = imageUrl;
            // Target _blank agar tidak meninggalkan halaman saat mengunduh via klik kanan
            downloadButton.target = '_blank';
            downloadButton.download = `alfhaiz-ai-${Date.now()}.png`;
            downloadButton.className = 'download-btn';
            downloadButton.title = "Download Image";
            downloadButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
            
            container.appendChild(img);
            container.appendChild(downloadButton);
            messageDiv.appendChild(container);
        }
        // Lampiran dari pengguna (kode lama)
        else if (imageUrl) {
            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = "Lampiran";
            messageDiv.appendChild(img);
        }

        if (text) {
            const p = document.createElement('p');
            if (role !== 'user' && window.marked) { p.innerHTML = marked.parse(text); } 
            else { p.textContent = text; }
            messageDiv.appendChild(p);
        }
        
        if (sourceLinks && sourceLinks.length > 0) {
            const sourcesDiv = document.createElement('div');
            sourcesDiv.className = 'source-links';
            sourcesDiv.innerHTML = '<p>Sumber:</p><ul>' + sourceLinks.map(link => `<li><a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.title || link.url}</a></li>`).join('') + '</ul>';
            messageDiv.appendChild(sourcesDiv);
        }

        if (chatContainer) chatContainer.appendChild(messageDiv);
        scrollToBottom();
    }

    // --- Fungsi Loading & History (Kode Asli yang Diperbaiki) ---
    function appendLoadingIndicator() { const loadingDiv = document.createElement('div'); loadingDiv.className = 'loading-indicator'; const loadingPhrases = ["Tunggu sebentar...", "Alfhaiz sedang berfikir...", "Mencari informasi terkini...", "Menyusun jawaban terbaik...", "Hampir selesai..."]; const loaderIcon = document.createElement('div'); loaderIcon.className = 'gemini-loader'; const loadingText = document.createElement('span'); loadingText.className = 'loading-text'; loadingText.textContent = loadingPhrases[0]; loadingDiv.appendChild(loaderIcon); loadingDiv.appendChild(loadingText); if (chatContainer) chatContainer.appendChild(loadingDiv); scrollToBottom(); let phraseIndex = 1; const textInterval = setInterval(() => { loadingText.textContent = loadingPhrases[phraseIndex % loadingPhrases.length]; phraseIndex++; }, 2000); return { element: loadingDiv, intervalId: textInterval }; }
    if (newChatBtn) newChatBtn.addEventListener("click", (e) => { e.preventDefault(); currentChatId = null; clearChatScreen(); if (body.classList.contains("sidebar-open")) toggleSidebar(); newChatBtn.classList.add('active'); });
    function clearChatScreen() { const messages = chatContainer.querySelectorAll('.message, .loading-indicator'); messages.forEach(msg => msg.remove()); if (welcomeScreen) welcomeScreen.style.display = 'block'; clearAttachment(); document.querySelectorAll('#history-container .nav-item').forEach(item => item.classList.remove('active')); }
    function createHistoryItem(chatId, prompt) { if (!historyContainer) return; const historyItem = document.createElement('a'); historyItem.href = '#'; historyItem.className = 'nav-item'; historyItem.dataset.chatId = chatId; historyItem.innerHTML = `<svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M21 11.01L3 11v2h18zM3 16h12v2H3zM21 6H3v2.01L21 8z"></path></svg><span>${prompt.substring(0, 20) + (prompt.length > 20 ? '...' : '')}</span>`; historyItem.addEventListener('click', (e) => { e.preventDefault(); loadChatHistory(chatId); }); historyContainer.prepend(historyItem); setActiveHistoryItem(chatId); }
    function loadChatHistory(chatId) { if (!allChats[chatId]) return; currentChatId = chatId; clearChatScreen(); if (welcomeScreen) welcomeScreen.style.display = 'none'; const chatHistory = allChats[chatId]; chatHistory.forEach(message => { const text = message.parts.find(p => p.text)?.text || ''; const imagePart = message.parts.find(p => p.inlineData); const imageUrl = imagePart ? `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` : null; appendMessage(message.role, text, imageUrl); }); setActiveHistoryItem(chatId); }
    function setActiveHistoryItem(chatId) { document.querySelectorAll('#history-container .nav-item').forEach(item => { if (item.dataset.chatId === chatId) item.classList.add('active'); else item.classList.remove('active'); }); if (chatId) { newChatBtn.classList.remove('active'); } else { newChatBtn.classList.add('active'); } }
    function scrollToBottom() { if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight; }
});