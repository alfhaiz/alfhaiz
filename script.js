document.addEventListener("DOMContentLoaded", () => {
    // --- Bagian 1: Seleksi Elemen DOM (Lengkap) ---
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
    
    // Elemen Mode Agen (Lama & Baru)
    const agentModeBtn = document.getElementById('agent-mode-btn');
    const taskContainer = document.getElementById('task-progress-container'); // Panel Progress Baru
    const taskList = document.getElementById('task-list'); // List Tugas di Panel
    const progressHeader = document.getElementById('progress-header'); // Header Panel

    // --- Bagian 2: State Aplikasi ---
    let allChats = {};
    let currentChatId = null;
    let currentModel = 'gemini-2.5-flash'; // Update ke model yang lebih baru
    let attachedFile = null;
    let isAgentMode = false;
    let isProjectActive = false; // State baru untuk melacak proyek
    let isRecording = false;
    let recognition;
    let timerInterval;
    let abortController;

    // --- Bagian 3: Inisialisasi & Logika UI Dasar (Tidak Berubah) ---

    // Inisialisasi Speech Recognition
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
            chatInput.style.height = 'auto'; chatInput.style.height = `${chatInput.scrollHeight}px`;
        };
        recognition.onend = () => { isRecording = false; clearInterval(timerInterval); recorderStatus.style.display = 'none'; recorderActions.style.display = 'flex'; };
        recognition.onerror = (event) => { console.error("Speech Recognition Error:", event.error); isRecording = false; clearInterval(timerInterval); voiceRecorderUI.style.display = 'none'; inputWrapper.style.display = 'flex'; };
    } else { if (voiceBtn) voiceBtn.disabled = true; }
    
    // Helper Functions
    const formatTime = (seconds) => { const minutes = Math.floor(seconds / 60); const secs = seconds % 60; return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`; };
    const createVisualizerBars = () => { waveformVisualizer.innerHTML = ''; for (let i = 0; i < 20; i++) { const bar = document.createElement('div'); bar.className = 'waveform-bar'; bar.style.animationDelay = `${Math.random()*0.5}s`; bar.style.animationDuration = `${0.8+Math.random()*0.7}s`; waveformVisualizer.appendChild(bar); }};
    const showNotification = (message) => { notificationToast.textContent = message; notificationToast.classList.add('show'); setTimeout(() => { notificationToast.classList.remove('show'); }, 3000); };
    const scrollToBottom = () => { if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight; }

    // Event Listeners UI Dasar
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
    modelOptions.forEach(option => { option.addEventListener('click', () => { currentModel = option.dataset.model; modelDisplayName.textContent = option.dataset.displayName; modelOptions.forEach(opt => opt.classList.remove('selected')); option.classList.add('selected'); modelModal.classList.remove('active'); showNotification(`${option.dataset.displayName.toUpperCase()} READY`); }); });
    fileInput.addEventListener('change', (event) => { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onloadend = () => { const dataUrl = reader.result; const base64Data = dataUrl.split(',')[1]; attachedFile = { mimeType: file.type, base64: base64Data }; displayAttachmentPreview(file.name, dataUrl); }; reader.readAsDataURL(file); filePopupMenu.classList.remove('active'); });
    chatInput.addEventListener('input', () => { chatInput.style.height = 'auto'; chatInput.style.height = `${chatInput.scrollHeight}px`; });

    // --- Bagian 4: Logika Inti yang Di-upgrade ---

    // Tombol Mode Agen (Sekarang hanya mengubah state)
    agentModeBtn.addEventListener('click', () => {
        isAgentMode = !isAgentMode;
        agentModeBtn.classList.toggle('active');
        showNotification(isAgentMode ? 'Mode Proyek Diaktifkan' : 'Mode Proyek Dinonaktifkan');
        if (isProjectActive) { // Batalkan proyek jika mode diubah
            isProjectActive = false;
            generateBtn.disabled = false;
            taskContainer.style.display = 'none';
        }
    });
    
    // Panel Progress (Baru)
    progressHeader.addEventListener('click', () => {
        taskContainer.classList.toggle('collapsed');
    });

    // Fungsi Pengiriman Pesan (Controller Utama)
    const handleSendMessage = async () => {
        const prompt = chatInput.value.trim();
        if ((!prompt && !attachedFile) || isProjectActive) return;

        displayUserMessage(prompt);
        chatInput.value = '';
        chatInput.style.height = 'auto';
        clearAttachment();
        
        generateBtn.disabled = true;

        try {
            if (isAgentMode) {
                // Jalankan alur "Manus AI" jika mode agen aktif
                await startProject(prompt);
            } else {
                // Jalankan alur chat biasa
                await runChatConversation();
            }
        } catch (error) {
            console.error("Error during generation:", error);
            displayAIMessage("Maaf, terjadi kesalahan di pihak saya. Coba lagi nanti ya. 🙏");
        } finally {
            generateBtn.disabled = false;
        }
    };
    
    generateBtn.onclick = handleSendMessage;
    chatInput.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } });
    
    // Alur Chat Biasa
    async function runChatConversation() {
        const loadingState = appendLoadingIndicator();
        abortController = new AbortController();
        generateBtn.classList.add('generating');
        let seconds = 0;
        const generationTimer = setInterval(() => { seconds++; if (generateBtn.querySelector('.stop-timer')) generateBtn.querySelector('.stop-timer').textContent = formatTime(seconds); }, 1000);
        generateBtn.onclick = () => { abortController.abort(); };

        try {
            const result = await callApi(allChats[currentChatId], 'chat');
            clearInterval(loadingState.intervalId);
            loadingState.element.remove();
            displayAIMessage(result.data);
        } catch (error) {
            clearInterval(loadingState.intervalId);
            loadingState.element.remove();
            if (error.name === 'AbortError') { displayAIMessage('Respon dihentikan.'); } 
            else { console.error("Error fetching AI response:", error); displayAIMessage('Maaf, terjadi kesalahan. 🤖'); }
        } finally {
            generateBtn.classList.remove('generating');
            clearInterval(generationTimer);
            generateBtn.onclick = handleSendMessage;
        }
    }
    
    // --- Bagian 5: Logika "Manus AI" (Baru) ---

    // Memulai dan Mengelola Proyek
    async function startProject(prompt) {
        isProjectActive = true;
        
        const loadingState = appendLoadingIndicator();
        try {
            const planResponse = await callApi([{ role: "user", parts: [{ text: prompt }] }], 'manus_planner');
            if (!planResponse.data || !planResponse.data.project_plan) {
                throw new Error("AI did not return a valid project plan.");
            }
            
            loadingState.element.remove();
            const projectPlan = planResponse.data.project_plan;
            showProjectPlan(projectPlan);
            displayAIMessage("Tentu, saya siap membantu. Rencana proyek sudah saya susun di panel atas. Kita mulai dengan tahap pertama ya? 👍");
            
            for (let i = 0; i < projectPlan.length; i++) {
                await executeStage(i, projectPlan[i]);
            }

        } catch (error) {
            loadingState.element.remove();
            displayAIMessage("Maaf, saya gagal membuat rencana proyek. Coba berikan perintah yang lebih jelas.");
            throw error; // Propagate error to the main handler
        } finally {
            isProjectActive = false;
        }
    }

    // Menjalankan setiap tahap proyek
    async function executeStage(stageIndex, stageData) {
        const taskItem = document.getElementById(`task-${stageIndex}`);
        taskItem.classList.add('in-progress');
        const loadingState = appendLoadingIndicator();
        
        const taskPrompt = `Kerjakan tugas ini: "${stageData.title}". Deskripsi: "${stageData.description}"`;
        const resultResponse = await callApi([{ role: "user", parts: [{ text: taskPrompt }] }], 'manus_executor');
        const result = resultResponse.data;

        loadingState.element.remove();
        taskItem.classList.remove('in-progress');
        taskItem.classList.add('completed');
        taskItem.querySelector('.task-item-description').textContent = result.summary;
        
        displayAIMessage(result.chat_message);
    }
    
    // Menampilkan panel progress
    function showProjectPlan(plan) {
        taskList.innerHTML = '';
        plan.forEach((task, index) => {
            const li = document.createElement('li');
            li.className = 'task-item';
            li.id = `task-${index}`;
            li.innerHTML = `<div class="task-item-title"><div class="task-status-icon"></div><span>${task.title}</span></div><p class="task-item-description">${task.description}</p>`;
            taskList.appendChild(li);
        });
        taskContainer.style.display = 'block';
        if (taskContainer.classList.contains('collapsed')) {
             taskContainer.classList.remove('collapsed');
        }
    }

    // --- Bagian 6: Fungsi Helper & Sistem History (Terintegrasi) ---

    // Fungsi terpusat untuk memanggil API
    async function callApi(history, mode) {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: abortController ? abortController.signal : null,
            body: JSON.stringify({ history, model: currentModel, mode })
        });
        if (!response.ok) { const errorBody = await response.json(); throw new Error(errorBody.error || `HTTP error! status: ${response.status}`); }
        return await response.json();
    }

    // Fungsi untuk menampilkan pesan user & update history
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

    // Fungsi untuk menampilkan pesan AI & update history
    function displayAIMessage(message) {
        appendMessage('model', message);
        if(currentChatId && allChats[currentChatId]) {
            allChats[currentChatId].push({ role: 'model', parts: [{ text: message }] });
        }
    }

    // Fungsi dasar untuk render pesan ke DOM
    function appendMessage(role, text, imageUrl = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role === 'user' ? 'user' : 'ai'}`;
        if (imageUrl) { const img = document.createElement('img'); img.src = imageUrl; img.alt = "Lampiran"; messageDiv.appendChild(img); }
        if (text) {
            const p = document.createElement('p');
            if (role !== 'user' && window.marked) {
                p.innerHTML = marked.parse(text);
            } else {
                p.textContent = text;
            }
            messageDiv.appendChild(p);
        }
        chatContainer.appendChild(messageDiv);
        scrollToBottom();
    }
    
    // Fungsi loading (tidak berubah)
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
        }, 2000);
        return { element: loadingDiv, intervalId: textInterval };
    }

    // Fungsi Penanganan Attachment & History (tidak berubah)
    function displayAttachmentPreview(fileName, dataUrl) { attachmentPreview.innerHTML = `<div class="preview-item">${dataUrl.startsWith('data:image')?`<img src="${dataUrl}" alt="Preview">`:''}<span>${fileName}</span><button class="remove-attachment-btn" id="remove-attachment-btn">&times;</button></div>`; document.getElementById('remove-attachment-btn').addEventListener('click', clearAttachment); }
    function clearAttachment() { attachedFile = null; fileInput.value = ''; attachmentPreview.innerHTML = ''; }
    newChatBtn.addEventListener("click", (e) => { e.preventDefault(); currentChatId = null; clearChatScreen(); if (body.classList.contains("sidebar-open")) body.classList.remove("sidebar-open"); setActiveHistoryItem(null); });
    function clearChatScreen() { chatContainer.querySelectorAll('.message, .loading-indicator').forEach(msg => msg.remove()); welcomeScreen.style.display = 'block'; clearAttachment(); document.querySelectorAll('#history-container .nav-item').forEach(item => item.classList.remove('active')); }
    function createHistoryItem(chatId, prompt) { const historyItem = document.createElement('a'); historyItem.href = '#'; historyItem.className = 'nav-item'; historyItem.dataset.chatId = chatId; historyItem.innerHTML = `<svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M21 11.01L3 11v2h18zM3 16h12v2H3zM21 6H3v2.01L21 8z"></path></svg><span>${prompt.substring(0,20)+(prompt.length>20?'...':'')}</span>`; historyItem.addEventListener('click', (e) => { e.preventDefault(); loadChatHistory(chatId); }); historyContainer.prepend(historyItem); setActiveHistoryItem(chatId); }
    function loadChatHistory(chatId) { if (!allChats[chatId]) return; currentChatId = chatId; clearChatScreen(); welcomeScreen.style.display = 'none'; const chatHistory = allChats[chatId]; chatHistory.forEach(message => { const text = message.parts.find(p => p.text)?.text || ''; const imagePart = message.parts.find(p => p.inlineData); const imageUrl = imagePart ? `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` : null; appendMessage(message.role, text, imageUrl); }); setActiveHistoryItem(chatId); }
    function setActiveHistoryItem(chatId) { document.querySelectorAll('#history-container .nav-item').forEach(item => { if (item.dataset.chatId === chatId) item.classList.add('active'); else item.classList.remove('active'); }); if (chatId) newChatBtn.classList.remove('active'); else newChatBtn.classList.add('active'); }
});