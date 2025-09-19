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
    const attachBtn = document.getElementById("attach-btn");
    const fileInput = document.getElementById("file-input");
    const attachmentPreview = document.getElementById("attachment-preview");

    // --- Variabel State Aplikasi ---
    let conversationHistory = [];

    // --- Sidebar & Menu ---
    const toggleSidebar = () => body.classList.toggle("sidebar-open");
    menuToggleBtn.addEventListener("click", toggleSidebar);
    sidebarOverlay.addEventListener("click", toggleSidebar);
    optionsBtn.addEventListener("click", (e) => { e.stopPropagation(); optionsMenu.classList.toggle("active"); });
    window.addEventListener("click", () => optionsMenu.classList.remove("active"));
    exportChatBtn.addEventListener("click", () => alert("Fungsi 'Export Chat' akan segera hadir!"));
    deleteChatBtn.addEventListener("click", () => { if (confirm("Hapus percakapan ini?")) { newChatBtn.click(); } });

    // --- Fungsi "New Chat" ---
    newChatBtn.addEventListener("click", (e) => {
        e.preventDefault();
        chatContainer.innerHTML = '';
        if (welcomeScreen) {
            welcomeScreen.style.display = 'block'; // Ensure it's a block element
            chatContainer.appendChild(welcomeScreen);
        }
        conversationHistory = []; // PENTING: Mengosongkan memori AI
        attachmentPreview.innerHTML = ''; // Membersihkan pratinjau file
        fileInput.value = ''; // Mereset input file
        document.querySelectorAll('#history-container .nav-item').forEach(item => item.classList.remove('active'));
        if(body.classList.contains("sidebar-open")) toggleSidebar();
    });

    // --- Logika Lampiran File ---
    attachBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
        if (fileInput.files.length > 0) {
            const fileName = fileInput.files[0].name;
            attachmentPreview.textContent = `File terlampir: ${fileName}`;
        }
    });

    // --- Auto-resize Textarea ---
    chatInput.addEventListener('input', () => { chatInput.style.height = 'auto'; chatInput.style.height = `${chatInput.scrollHeight}px`; });

    // --- Fungsi Pengiriman Pesan (Besar) ---
    const handleSendMessage = async () => {
        const prompt = chatInput.value.trim();
        if (!prompt) return;

        if (welcomeScreen) welcomeScreen.style.display = 'none';
        
        if (conversationHistory.length === 0) {
            createHistoryItem(prompt);
        }
        
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
            appendMessage('model', result.data); // 'model' adalah peran AI
            conversationHistory.push({ role: 'model', parts: [{ text: result.data }] });
        } catch (error) {
            console.error("Error fetching AI response:", error);
            loadingIndicator.remove();
            appendMessage('model', 'Maaf, terjadi kesalahan. 🤖 Mari kita coba lagi.');
        }
    };

    // --- Event Listener Kirim ---
    sendBtn.addEventListener("click", handleSendMessage);
    chatInput.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } });

    // --- Fungsi Tampilan Pesan (dengan Markdown) ---
    function appendMessage(role, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role === 'user' ? 'user' : 'ai'}`;
        
        if (role !== 'user' && window.marked) {
            messageDiv.innerHTML = marked.parse(text);
        } else {
            messageDiv.textContent = text;
        }
        chatContainer.appendChild(messageDiv);
        scrollToBottom();
    }

    // --- Fungsi Tampilan Loading ---
    function appendLoadingIndicator() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-indicator';
        loadingDiv.innerHTML = `
<div class="spinner">
</div>
`;
        chatContainer.appendChild(loadingDiv);
        scrollToBottom();
        return loadingDiv;
    }
    
    // --- Fungsi untuk Membuat Item History ---
    function createHistoryItem(prompt) {
        document.querySelectorAll('#history-container .nav-item').forEach(item => item.classList.remove('active'));
        
        const historyItem = document.createElement('a');
        historyItem.href = '#';
        historyItem.className = 'nav-item active';
        historyItem.innerHTML = `
<svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21 11.01L3 11v2h18zM3 16h12v2H3zM21 6H3v2.01L21 8z">
    </path>
</svg>
<span>
    ${prompt.substring(0, 20) + (prompt.length > 20 ? '...' : '')}
</span>
`;
        historyContainer.prepend(historyItem);
    }
    
    // --- Fungsi untuk Auto-scroll ---
    function scrollToBottom() {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
});```