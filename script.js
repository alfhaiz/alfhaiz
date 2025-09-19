document.addEventListener("DOMContentLoaded", () => {
    // --- Elemen DOM ---
    const menuToggleBtn = document.getElementById("menu-toggle-btn");
    const sidebarOverlay = document.getElementById("sidebar-overlay");
    const body = document.body;
    const chatInput = document.getElementById("chat-input");
    const sendBtn = document.getElementById("send-btn");
    const messagesContainer = document.getElementById("messages-container");
    const welcomeScreen = document.getElementById("welcome-screen");

    // --- Sidebar Toggle untuk Mobile ---
    const toggleSidebar = () => body.classList.toggle("sidebar-open");
    menuToggleBtn.addEventListener("click", toggleSidebar);
    sidebarOverlay.addEventListener("click", toggleSidebar);

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
    sendBtn.addEventListener("click", handleSendMessage);
    chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    // --- Fungsi Bantuan untuk Menampilkan Pesan ---
    function appendMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        const avatarInitial = sender === 'user' ? 'U' : 'A';
        messageDiv.innerHTML = `
            <div class="message-inner">
                <div class="avatar">${avatarInitial}</div>
                <div class="message-content">
                    <p>${text}</p>
                </div>
            </div>`;
        messagesContainer.appendChild(messageDiv);
        scrollToBottom();
    }

    // --- Fungsi Bantuan untuk Menampilkan Loading ---
    function appendLoadingIndicator() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message ai';
        loadingDiv.innerHTML = `
            <div class="message-inner">
                 <div class="avatar">A</div>
                 <div class="message-content loading-indicator">
                     <span class="dot"></span><span class="dot"></span><span class="dot"></span>
                 </div>
            </div>`;
        messagesContainer.appendChild(loadingDiv);
        scrollToBottom();
        return loadingDiv;
    }

    // --- Fungsi untuk Auto-scroll ---
    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
});