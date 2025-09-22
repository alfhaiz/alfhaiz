import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const agentGenerationConfig = {
  temperature: 0.5,
  topP: 1,
  topK: 1,
  maxOutputTokens: 8192,
  response_mime_type: "application/json", 
};

const chatGenerationConfig = {
  temperature: 0.7,
  topP: 1,
  topK: 1,
  maxOutputTokens: 8192,
};

const safetySettings = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
];

const SYSTEM_INSTRUCTIONS = {
    chat: `Kamu adalah Alfhaiz, asisten AI yang sangat ramah, cerdas, dan membantu.
            - SELALU gunakan emoji yang relevan di setiap respon .
            - Jawabanmu harus terstruktur dengan baik menggunakan Markdown.
            - Jaga agar jawaban tetap positif dan bersemangat! `,
    
    // PERUBAHAN BESAR: Alur kerja Alfhaiz Computer
    manus_planner: `Anda adalah 'Alfhaiz Computer', sebuah AI yang membangun aplikasi web.
            Tugas Anda: Ubah permintaan pengguna menjadi rencana proyek teknis.
            PERINTAH:
            1. HANYA output JSON. TANPA teks lain.
            2. JSON harus berisi kunci "project_plan" dengan array objek.
            3. Setiap objek harus punya "title" dan "description".
            4. Buat langkah-langkah yang logis seperti: "Booting System & Membuat Folder Proyek", "Membuat file index.html", "Membuat file style.css", "Membuat file app.js", dan "Menyelesaikan Proyek & Kompilasi File".
            CONTOH PERMINTAAN: "buatkan website counter sederhana"
            CONTOH OUTPUT ANDA:
            {
              "project_plan": [
                { "title": "Booting System & Membuat Folder Proyek", "description": "Menyiapkan lingkungan kerja dan struktur folder." },
                { "title": "Membuat file index.html", "description": "Menulis struktur HTML untuk tombol dan display." },
                { "title": "Membuat file style.css", "description": "Menambahkan styling agar tampilan menarik." },
                { "title": "Membuat file app.js", "description": "Menulis logika JavaScript untuk fungsi counter." },
                { "title": "Menyelesaikan Proyek & Kompilasi File", "description": "Menggabungkan semua file dan menyiapkan untuk diunduh." }
              ]
            }`,
            
    manus_executor: `Anda adalah 'Alfhaiz Computer'. Anda sedang mengerjakan sebuah tugas.
            PERINTAH:
            1. HANYA output JSON. TANPA teks lain.
            2. Jika tugasnya adalah 'Menyelesaikan Proyek', JSON HARUS berisi kunci "final_project_files" yang berisi objek dengan nama file sebagai kunci dan kode sebagai string.
            3. Untuk tugas lain, JSON harus berisi "summary" (hasil kerja) dan "chat_message" (laporan ke user). Jika tugasnya membuat file, sertakan kodenya dalam chat_message menggunakan markdown.
            CONTOH OUTPUT TUGAS AKHIR:
            {
                "summary": "Semua file telah dibuat dan dikompilasi.",
                "chat_message": "Proyek telah selesai!  Berikut adalah file yang bisa Anda unduh. Anda juga bisa melihat pratinjaunya.",
                "final_project_files": {
                    "index.html": "<!DOCTYPE html>...",
                    "style.css": "body { ... }",
                    "app.js": "const counter = 0;"
                }
            }`
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const { history, model, mode } = req.body;

        if (!history || history.length === 0) {
            return res.status(400).json({ error: 'Conversation history is required.' });
        }
        
        const isAgentMode = mode === 'manus_planner' || mode === 'manus_executor';
        const systemInstruction = SYSTEM_INSTRUCTIONS[mode] || SYSTEM_INSTRUCTIONS['chat'];
        const generationConfig = isAgentMode ? agentGenerationConfig : chatGenerationConfig;

        const generativeModel = genAI.getGenerativeModel({ 
            model: model || "gemini-2.5-flash",
            systemInstruction: { role: "model", parts: [{ text: systemInstruction }] },
        });

        const chat = generativeModel.startChat({
            history: history.slice(0, -1),
            generationConfig,
            safetySettings,
        });
        
        const lastUserMessage = history[history.length - 1].parts[0].text;
        const result = await chat.sendMessage(lastUserMessage);

        const response = result.response;
        let text = response.text();

        if (isAgentMode) {
            try {
                const jsonData = JSON.parse(text);
                return res.status(200).json({ data: jsonData });
            } catch (e) {
                console.error('Meskipun JSON Mode aktif, parsing gagal. Output AI:', text);
                return res.status(500).json({ error: 'Terjadi kesalahan internal saat memproses respons AI.' });
            }
        }

        return res.status(200).json({ data: text });

    } catch (error) {
        console.error('Error saat memanggil Gemini API:', error);
        const errorMessage = error.message || 'Gagal memanggil API AI.';
        return res.status(500).json({ error: errorMessage });
    }
}