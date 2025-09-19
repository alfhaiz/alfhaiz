document.addEventListener("DOMContentLoaded", () => {
    // --- Elemen DOM ---
    const body = document.body;
    const menuToggleBtn = document.getElementById("menu-toggle-btn");
    const sidebarOverlay = document.getElementById("sidebar-overlay");
    const newChatBtn = document.getElementById("new-chat-btn");
    const messagesContainer = document.getElementById("messages-container");
    const welcomeScreen = document.getElementById("welcome-screen");
    const chatInput = document.getElementById("chat-input");
    const sendBtn = document.getElementById("send-btn");
    const historyContainer = document.getElementById("history-container");
    const historySection = document.getElementById("history-section");
    
    let isNewChat = true;

    // --- Sidebar Toggle untuk Mobile ---
    const toggleSidebar = () => body.classList.toggle("sidebar-open");
    menuToggleBtn.addEventListener("click", toggleSidebar);
    sidebarOverlay.addEventListener("click", toggleSidebar);

    // --- Fungsi "New Chat" ---
    newChatBtn.addEventListener("click", (e) => {
        e.preventDefault();
        messagesContainer.innerHTML = ''; // Hapus semua pesan
        messagesContainer.appendChild(welcomeScreen); // Tampilkan lagi welcome screen
        welcomeScreen.style.display = 'block';
        isNewChat = true;
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
        
        // Buat history item jika ini pesan pertama
        if (isNewChat) {
            createHistoryItem(prompt);
            isNewChat = false;
        }

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
            appendTypingMessage('ai', result.data); // Gunakan fungsi typing baru
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

    // --- Fungsi untuk Menampilkan Pesan Statis (User) ---
    function appendMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        const avatarInitial = sender === 'user' ? 'U' : 'A';
        messageDiv.innerHTML = `
            <div class="avatar">${avatarInitial}</div>
            <div class="message-content"><p>${text}</p></div>`;
        messagesContainer.appendChild(messageDiv);
        scrollToBottom();
    }
    
    // --- Fungsi BARU untuk Menampilkan Respons AI dengan Efek Typing ---
    function appendTypingMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        const avatarInitial = 'A';
        messageDiv.innerHTML = `
            <div class="avatar">${avatarInitial}</div>
            <div class="message-content"><p></p></div>`;
        messagesContainer.appendChild(messageDiv);
        
        const p = messageDiv.querySelector('p');
        const words = text.split(' ');
        let i = 0;

        function typeWord() {
            if (i < words.length) {
                const wordSpan = document.createElement('span');
                wordSpan.textContent = words[i] + ' ';
                // Style agar animasi terlihat
                wordSpan.style.display = 'inline-block';
                p.appendChild(wordSpan);
                i++;
                scrollToBottom();
                setTimeout(typeWord, 100); // Jeda antar kata
            }
        }
        typeWord();
    }

    // --- Fungsi BARU untuk Menampilkan Loading Spinner ---
    function appendLoadingIndicator() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ai';
        messageDiv.innerHTML = `
            <div class="avatar">A</div>
            <div class="loading-indicator">
                <div class="spinner"></div>
            </div>`;
        messagesContainer.appendChild(messageDiv);
        scrollToBottom();
        return messageDiv;
    }

    // --- Fungsi BARU untuk Membuat Item History ---
    function createHistoryItem(prompt) {
        if(historyContainer.children.length === 0) historySection.style.display = 'block';

        const historyItem = document.createElement('a');
        historyItem.href = '#';
        historyItem.className = 'nav-item';
        historyItem.textContent = prompt.substring(0, 25) + (prompt.length > 25 ? '...' : '');
        // Tambahkan di awal list
        historyContainer.prepend(historyItem);
    }

    // --- Fungsi untuk Auto-scroll ---
    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Sembunyikan section history jika kosong
    historySection.style.display = 'none';
});