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

    // --- Variabel State Aplikasi ---
    let conversationHistory = [];
    let attachedFile = null;

    // --- Sidebar & Menu ---
    const toggleSidebar = () => body.classList.toggle("sidebar-open");
    menuToggleBtn.addEventListener("click", toggleSidebar);
    sidebarOverlay.addEventListener("click", toggleSidebar);
    voiceBtn.addEventListener('click', () => alert('Fungsi Voice akan segera hadir!'));

    // --- Logika Menu Popup File BARU ---
    moreOptionsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        filePopupMenu.classList.toggle('active');
    });
    window.addEventListener("click", () => {
        filePopupMenu.classList.remove('active');
    });
    
    // --- Fungsionalitas Tombol Popup ---
    attachFileBtn.addEventListener('click', () => {
        fileInput.removeAttribute('capture');
        fileInput.setAttribute('accept', '*/*'); // Terima semua jenis file
        fileInput.click();
    });
    attachCameraBtn.addEventListener('click', () => {
        fileInput.setAttribute('capture', 'environment');
        fileInput.setAttribute('accept', 'image/*'); // Hanya terima gambar dari kamera
        fileInput.click();
    });

    // --- Fungsi "New Chat" ---
    newChatBtn.addEventListener("click", (e) => {
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

    function displayAttachmentPreview(fileName, dataUrl) {
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
        fileInput.value = '';
        attachmentPreview.innerHTML = '';
    }

    // --- Auto-resize Textarea ---
    chatInput.addEventListener('input', () => { chatInput.style.height = 'auto'; chatInput.style.height = `${chatInput.scrollHeight}px`; });

    // --- Fungsi Pengiriman Pesan ---
    const handleSendMessage = async () => {
        const prompt = chatInput.value.trim();
        if (!prompt && !attachedFile) return;

        if (welcomeScreen) welcomeScreen.style.display = 'none';
        if (conversationHistory.length === 0 && prompt) { createHistoryItem(prompt); }
        
        const userParts = [];
        if (attachedFile) {
            userParts.push({ inlineData: { mimeType: attachedFile.mimeType, data: attachedFile.base64 } });
        }
        if (prompt) {
            userParts.push({ text: prompt });
        }

        appendMessage('user', prompt, attachedFile ? `data:${attachedFile.mimeType};base64,${attachedFile.base64}` : null);
        conversationHistory.push({ role: 'user', parts: userParts });

        chatInput.value = '';
        chatInput.style.height = 'auto';
        clearAttachment();
        const loadingIndicator = appendLoadingIndicator();

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ history: conversationHistory }),
            });
            if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
            const result = await response.json();
            
            loadingIndicator.remove();
            appendMessage('model', result.data);
            conversationHistory.push({ role: 'model', parts: [{ text: result.data }] });
        } catch (error) {
            console.error("Error fetching AI response:", error);
            loadingIndicator.remove();
            appendMessage('model', 'Maaf, terjadi kesalahan. 🤖 Mari kita coba lagi.');
        }
    };

    // --- Event Listener Kirim ---
    generateBtn.addEventListener("click", handleSendMessage);
    chatInput.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } });

    // --- Fungsi Tampilan Pesan (DIPERBARUI) ---
    function appendMessage(role, text, imageUrl = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role === 'user' ? 'user' : 'ai'}`;
        
        // Untuk pesan user, gambar muncul di atas teks
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
        
        chatContainer.appendChild(messageDiv);
        scrollToBottom();
    }

    // --- Fungsi Lainnya ---
    function appendLoadingIndicator() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-indicator';
        loadingDiv.innerHTML = `<div class="spinner"></div>`;
        chatContainer.appendChild(loadingDiv);
        scrollToBottom();
        return loadingDiv;
    }
    
    function createHistoryItem(prompt) {
        document.querySelectorAll('#history-container .nav-item').forEach(item => item.classList.remove('active'));
        const historyItem = document.createElement('a');
        historyItem.href = '#';
        historyItem.className = 'nav-item active';
        historyItem.innerHTML = `<svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M21 11.01L3 11v2h18zM3 16h12v2H3zM21 6H3v2.01L21 8z"></path></svg><span>${prompt.substring(0, 20) + (prompt.length > 20 ? '...' : '')}</span>`;
        historyContainer.prepend(historyItem);
    }
    
    function scrollToBottom() {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
});