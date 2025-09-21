document.addEventListener("DOMContentLoaded", () => {
    // --- Elemen DOM ---
    const body = document.body;
    const menuToggleBtn = document.getElementById("menu-toggle-btn");
    const sidebarOverlay = document.getElementById("sidebar-overlay");
    const newChatBtn = document.getElementById("new-chat-btn");
    const chatContainer = document.getElementById("chat-container");
    const chatTitle = document.getElementById("chat-title");
    const sendBtn = document.getElementById("send-btn");
    const attachBtn = document.getElementById("attach-btn");
    const chatInput = document.getElementById("chat-input");
    const computerActivity = document.getElementById('computer-activity');
    const historyContainer = document.getElementById('history-container');

    // --- State Aplikasi ---
    let currentChatId = null;
    let allChats = {}; // { chatId: [{ role, parts }] }
    
    // --- Sidebar & Menu ---
    const toggleSidebar = () => body.classList.toggle("sidebar-open");
    if (menuToggleBtn) menuToggleBtn.addEventListener("click", toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener("click", toggleSidebar);

    // --- Helper & Utility Functions ---
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    function sanitizeText(text) {
        const p = document.createElement('p');
        p.textContent = text;
        return p.innerHTML;
    }

    // --- Fungsi Tampilan Dinamis ---
    function appendAgentTaskMessage(task) {
        const taskElement = document.createElement('div');
        taskElement.className = 'message agent-task';
        taskElement.innerHTML = `
            <div class="task-header">
                <div class="task-icon thinking"></div>
                <h4>${sanitizeText(task.title)}</h4>
            </div>
            <div class="task-body" style="display: none;">
                <p class="ai-explanation">${sanitizeText(task.explanation)}</p>
                <div class="simulated-actions-container"></div>
            </div>
        `;
        chatContainer.appendChild(taskElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        return taskElement;
    }

    async function runSimulation(taskElement, actions) {
        const taskHeader = taskElement.querySelector('.task-header');
        const taskBody = taskElement.querySelector('.task-body');
        const taskIcon = taskElement.querySelector('.task-icon');
        const actionsContainer = taskElement.querySelector('.simulated-actions-container');

        taskHeader.style.cursor = 'pointer';
        taskBody.style.display = 'block';

        const iconPaths = {
            search: "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
            file: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
            execute: "M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z",
            code: "M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"
        };
        
        for (const action of actions) {
            await sleep(1000 + Math.random() * 500);
            if (computerActivity) computerActivity.textContent = action.activity;
            const actionElement = document.createElement('div');
            actionElement.className = 'simulated-action';
            actionElement.innerHTML = `
                <div class="action-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="${iconPaths[action.icon] || iconPaths.code}"></path></svg></div>
                <span>${sanitizeText(action.description)}</span>
            `;
            actionsContainer.appendChild(actionElement);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        taskIcon.classList.remove('thinking');
        taskIcon.classList.add('done');
        taskIcon.innerHTML = `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path></svg>`;
    }

    // --- Fungsi Utama ---
    async function handleSendMessage() {
        const prompt = chatInput.value.trim();
        if (!prompt) return;
        
        const isNewChat = !currentChatId;
        if (isNewChat) {
            currentChatId = `chat_${Date.now()}`;
            allChats[currentChatId] = [];
            chatTitle.textContent = prompt;
            createHistoryItem(currentChatId, prompt);
        }

        chatContainer.innerHTML = '';
        chatInput.value = '';
        
        allChats[currentChatId].push({ role: 'user', parts: [{ text: prompt }] });
        
        // 1. Minta Rencana Kerja
        if (computerActivity) computerActivity.textContent = "Generating plan...";
        
        let planResponse;
        try {
            const planHistory = [...allChats[currentChatId]];
            // Tambahkan prompt tambahan untuk memastikan AI memberikan rencana
            planHistory.push({ role: 'user', parts: [{ text: `Based on my request "${prompt}", please provide a detailed work plan in the required JSON format.` }] });

            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    history: planHistory,
                    mode: 'plan'
                }),
            });
            if (!response.ok) throw new Error('Failed to get plan from AI');
            planResponse = await response.json();
            
             allChats[currentChatId].push({ role: 'model', parts: [{ text: planResponse.data }] });

        } catch (error) {
            console.error("Error getting plan:", error);
            chatContainer.innerHTML = `<p style="color: #FF453A;">Maaf, terjadi kesalahan saat merencanakan tugas.</p>`;
            return;
        }

        // 2. Eksekusi Simulasi berdasarkan Rencana
        try {
            const plan = JSON.parse(planResponse.data);
            for (const task of plan.tasks) {
                const taskElement = appendAgentTaskMessage(task);
                await sleep(500);
                await runSimulation(taskElement, task.actions);
            }
        } catch (e) {
            console.error("Error parsing or executing plan:", e);
            chatContainer.innerHTML = `<p style="color: #FF453A;">Maaf, AI memberikan rencana yang tidak valid.</p>`;
            const rawResponse = document.createElement('pre');
            rawResponse.style.whiteSpace = 'pre-wrap';
            rawResponse.style.color = '#8E8E93';
            rawResponse.textContent = `Raw AI response:\n${planResponse.data}`;
            chatContainer.appendChild(rawResponse);
            return;
        }

        // 3. Minta Kode Final setelah simulasi selesai
        if (computerActivity) computerActivity.textContent = "Building final code...";
        
        try {
            const codeHistory = [...allChats[currentChatId]];
             // Tambahkan prompt tambahan untuk memastikan AI memberikan kode
            codeHistory.push({ role: 'user', parts: [{ text: `The plan is complete. Now, please provide ONLY the final, complete, and runnable HTML code in a single block, based on the plan.` }] });

            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    history: codeHistory,
                    mode: 'agent'
                }),
            });
            if (!response.ok) throw new Error('Failed to get final code from AI');
            const codeResponse = await response.json();

            if (computerActivity) computerActivity.textContent = "Done!";
            const finalMessage = document.createElement('div');
            finalMessage.className = 'message agent-task';
            finalMessage.innerHTML = `<p class="ai-explanation">Luar biasa! Halaman berhasil dibuat. Sekarang Anda dapat melihat pratinjau, atau meminta perubahan lebih lanjut.</p>`;
            chatContainer.appendChild(finalMessage);
            // Di masa depan, di sinilah kita akan menampilkan pratinjau di iframe

        } catch (error) {
             console.error("Error getting final code:", error);
             if (computerActivity) computerActivity.textContent = "Error!";
             chatContainer.innerHTML += `<p style="color: #FF453A;">Maaf, terjadi kesalahan saat membuat kode final.</p>`;
        }
    }

    // --- Event Listeners ---
    if (sendBtn) sendBtn.addEventListener("click", handleSendMessage);
    if (chatInput) chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    if (newChatBtn) newChatBtn.addEventListener("click", (e) => {
        e.preventDefault();
        currentChatId = null;
        chatContainer.innerHTML = '';
        chatTitle.textContent = "New Chat";
        setActiveHistoryItem(null);
    });

    function createHistoryItem(chatId, prompt) {
        if (!historyContainer) return;
        const historyItem = document.createElement('a');
        historyItem.href = '#';
        historyItem.className = 'nav-item';
        historyItem.dataset.chatId = chatId;
        historyItem.innerHTML = `<svg class="nav-icon" viewBox="0 0 24 24"><path d="M21 11.01L3 11v2h18zM3 16h12v2H3zM21 6H3v2.01L21 8z"></path></svg><span>${prompt.substring(0, 20) + (prompt.length > 20 ? '...' : '')}</span>`;
        historyItem.addEventListener('click', (e) => {
            e.preventDefault();
            loadChatHistory(chatId);
        });
        historyContainer.prepend(historyItem);
        setActiveHistoryItem(chatId);
    }

    function loadChatHistory(chatId) {
        console.log("Memuat chat:", chatId);
        alert("Fungsi memuat history akan segera hadir!");
    }

    function setActiveHistoryItem(chatId) {
        document.querySelectorAll('#history-container .nav-item').forEach(item => {
            if (item.dataset.chatId === chatId) item.classList.add('active');
            else item.classList.remove('active');
        });
        if (chatId) {
            newChatBtn.classList.remove('active');
        } else {
            newChatBtn.classList.add('active');
        }
    }
});