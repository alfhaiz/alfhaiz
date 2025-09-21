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
    const fileInput = document.getElementById('file-input');

    // --- Variabel State Aplikasi ---
    let conversationHistory = [];

    // --- Sidebar & Menu ---
    const toggleSidebar = () => body.classList.toggle("sidebar-open");
    menuToggleBtn.addEventListener("click", toggleSidebar);
    sidebarOverlay.addEventListener("click", toggleSidebar);
    
    // --- Placeholder untuk tombol baru ---
    voiceBtn.addEventListener('click', () => alert('Fungsi Voice akan segera hadir!'));
    moreOptionsBtn.addEventListener('click', () => alert('Opsi lainnya akan segera hadir! Di sini Anda bisa menambahkan lampiran file.'));


    // --- Fungsi "New Chat" ---
    newChatBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const messages = chatContainer.querySelectorAll('.message, .loading-indicator');
        messages.forEach(msg => msg.remove());
        if (welcomeScreen) { welcomeScreen.style.display = 'block'; }
        conversationHistory = [];
        document.querySelectorAll('#history-container .nav-item').forEach(item => item.classList.remove('active'));
        if(body.classList.contains("sidebar-open")) toggleSidebar();
    });

    // --- Auto-resize Textarea ---
    chatInput.addEventListener('input', () => { 
        chatInput.style.height = 'auto'; 
        chatInput.style.height = `${chatInput.scrollHeight}px`; 
        // Sembunyikan placeholder jika user mulai mengetik
        const placeholder = chatInput.parentElement.querySelector('::before');
        if (placeholder) {
            placeholder.style.display = chatInput.value.length > 0 ? 'none' : 'block';
        }
    });

    // --- Fungsi Pengiriman Pesan ---
    const handleSendMessage = async () => {
        const prompt = chatInput.value.trim();
        if (!prompt) return;

        if (welcomeScreen) welcomeScreen.style.display = 'none';
        if (conversationHistory.length === 0) { createHistoryItem(prompt); }
        
        appendMessage('user', prompt);
        conversationHistory.push({ role: 'user', parts: [{ text: prompt }] });

        chatInput.value = '';
        chatInput.style.height = 'auto';
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

    // --- Fungsi Tampilan Pesan (dengan Markdown) ---
    function appendMessage(role, text, imageUrl = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role === 'user' ? 'user' : 'ai'}`;
        let content = '';
        if (text) {
             content += (role !== 'user' && window.marked) ? marked.parse(text.replace(/</g, "&lt;").replace(/>/g, "&gt;")) : `<p>${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
        }
        if (imageUrl) {
            content += `<img src="${imageUrl}" alt="Lampiran">`;
        }
        messageDiv.innerHTML = content;
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