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
    
    // --- Sidebar Toggle ---
    const toggleSidebar = () => body.classList.toggle("sidebar-open");
    menuToggleBtn.addEventListener("click", toggleSidebar);
    sidebarOverlay.addEventListener("click", toggleSidebar);

    // --- Fungsi "New Chat" ---
    newChatBtn.addEventListener("click", (e) => {
        e.preventDefault();
        chatContainer.innerHTML = '';
        chatContainer.appendChild(welcomeScreen);
        welcomeScreen.style.display = 'block';
        if(body.classList.contains("sidebar-open")) toggleSidebar();
    });

    // --- Auto-resize Textarea ---
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = `${chatInput.scrollHeight}px`;
    });

    // --- Fungsi Pengiriman Pesan ---
    const handleSendMessage = async () => {
        const prompt = chatInput.value.trim();
        if (!prompt) return;

        if (welcomeScreen) welcomeScreen.style.display = 'none';
        
        // Buat history item di sidebar (logika sederhana)
        createHistoryItem(prompt);

        appendMessage('user', prompt);
        chatInput.value = '';
        chatInput.style.height = 'auto';
        const loadingIndicator = appendLoadingIndicator();

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });
            if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
            const result = await response.json();
            loadingIndicator.remove();
            appendMessage('ai', result.data);
        } catch (error) {
            console.error("Error fetching AI response:", error);
            loadingIndicator.remove();
            appendMessage('ai', 'Maaf, terjadi kesalahan. Coba lagi nanti.');
        }
    };

    // --- Event Listener untuk Kirim ---
    generateBtn.addEventListener("click", handleSendMessage);
    chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    // --- Fungsi untuk Menampilkan Pesan ---
    function appendMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        const avatarInitial = sender === 'user' ? 'U' : 'A';
        messageDiv.innerHTML = `
            <div class="avatar">${avatarInitial}</div>
            <div class="message-content"><p>${text.replace(/\n/g, '<br>')}</p></div>`; // Ganti newline dengan <br>
        chatContainer.appendChild(messageDiv);
        scrollToBottom();
    }

    // --- Fungsi untuk Menampilkan Loading Spinner ---
    function appendLoadingIndicator() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ai';
        messageDiv.innerHTML = `
            <div class="avatar">A</div>
            <div class="loading-indicator">
                <div class="spinner"></div>
            </div>`;
        chatContainer.appendChild(messageDiv);
        scrollToBottom();
        return messageDiv;
    }
    
    // --- Fungsi untuk Membuat Item History ---
    function createHistoryItem(prompt) {
        const historyItem = document.createElement('a');
        historyItem.href = '#';
        historyItem.className = 'nav-item';
        historyItem.innerHTML = `
            <svg class="nav-icon" viewBox="0 0 24 24"><path d="M21 11.01L3 11v2h18zM3 16h12v2H3zM21 6H3v2.01L21 8z"></path></svg>
            <span>${prompt.substring(0, 20) + (prompt.length > 20 ? '...' : '')}</span>
        `;
        historyContainer.prepend(historyItem);
    }
    
    // --- Fungsi untuk Auto-scroll ---
    function scrollToBottom() {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
});