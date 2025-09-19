document.addEventListener("DOMContentLoaded", () => {
    // --- Elemen DOM ---
    const body = document.body;
    const menuToggleBtn = document.getElementById("menu-toggle-btn");
    const sidebarOverlay = document.getElementById("sidebar-overlay");
    const newChatBtn = document.getElementById("new-chat-btn");
    const chatContainer = document.getElementById("chat-container");
    const welcomeScreen = document.getElementById("welcome-screen");
    const chatInput = document.getElementById("chat-input");
    const sendBtn = document.getElementById("send-btn");
    const historyContainer = document.getElementById("history-container");
    const optionsBtn = document.getElementById("options-btn");
    const optionsMenu = document.getElementById("options-menu");
    const exportChatBtn = document.getElementById("export-chat-btn");
    const deleteChatBtn = document.getElementById("delete-chat-btn");

    let isNewChat = true;

    // --- Sidebar Toggle ---
    const toggleSidebar = () => body.classList.toggle("sidebar-open");
    menuToggleBtn.addEventListener("click", toggleSidebar);
    sidebarOverlay.addEventListener("click", toggleSidebar);

    // --- Opsi Menu (Titik Tiga) ---
    optionsBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // Mencegah event bubbling ke window
        optionsMenu.classList.toggle("active");
    });
    // Menutup menu jika klik di luar
    window.addEventListener("click", () => {
        if (optionsMenu.classList.contains("active")) {
            optionsMenu.classList.remove("active");
        }
    });

    // --- Placeholder Fungsionalitas Opsi ---
    exportChatBtn.addEventListener("click", () => alert("Fungsi 'Export Chat' akan segera hadir!"));
    deleteChatBtn.addEventListener("click", () => {
        if (confirm("Apakah Anda yakin ingin menghapus percakapan ini?")) {
            newChatBtn.click(); // Cara mudah untuk membersihkan chat
            // Logika untuk menghapus dari history akan ditambahkan di sini
            alert("Chat dihapus.");
        }
    });


    // --- Fungsi "New Chat" ---
    newChatBtn.addEventListener("click", (e) => {
        e.preventDefault();
        chatContainer.innerHTML = '';
        if (welcomeScreen) {
            chatContainer.appendChild(welcomeScreen);
            welcomeScreen.style.display = 'block';
        }
        isNewChat = true; // Set flag bahwa ini adalah chat baru
        // Menghapus status aktif dari semua history item
        document.querySelectorAll('#history-container .nav-item').forEach(item => item.classList.remove('active'));
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
        
        // Hanya buat history item jika ini adalah pesan pertama dari chat baru
        if (isNewChat) {
            createHistoryItem(prompt);
            isNewChat = false; // Setelah pesan pertama, ini bukan lagi chat baru
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

    // --- Fungsi untuk Menampilkan Pesan ---
    function appendMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        messageDiv.innerHTML = text.replace(/\n/g, '<br>');
        chatContainer.appendChild(messageDiv);
        scrollToBottom();
    }

    // --- Fungsi untuk Menampilkan Loading Spinner ---
    function appendLoadingIndicator() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-indicator';
        loadingDiv.innerHTML = `<div class="spinner"></div>`;
        chatContainer.appendChild(loadingDiv);
        scrollToBottom();
        return loadingDiv;
    }
    
    // --- Fungsi untuk Membuat Item History ---
    function createHistoryItem(prompt) {
        // Hapus status aktif dari item sebelumnya
        document.querySelectorAll('#history-container .nav-item').forEach(item => item.classList.remove('active'));
        
        const historyItem = document.createElement('a');
        historyItem.href = '#';
        historyItem.className = 'nav-item active'; // Langsung set sebagai aktif
        historyItem.innerHTML = `
            <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M21 11.01L3 11v2h18zM3 16h12v2H3zM21 6H3v2.01L21 8z"></path></svg>
            <span>${prompt.substring(0, 20) + (prompt.length > 20 ? '...' : '')}</span>
        `;
        historyContainer.prepend(historyItem);
    }
    
    // --- Fungsi untuk Auto-scroll ---
    function scrollToBottom() {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
});