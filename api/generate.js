import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Konfigurasi untuk mode Chat Biasa
const chatGenerationConfig = {
  temperature: 0.7,
  topP: 1,
  topK: 1,
  maxOutputTokens: 8192,
};

// Konfigurasi KHUSUS untuk Mode Proyek (Manus AI) dengan JSON Mode AKTIF
const agentGenerationConfig = {
  temperature: 0.5,
  topP: 1,
  topK: 1,
  maxOutputTokens: 8192,
  response_mime_type: "application/json", 
};

const safetySettings = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
];

const SYSTEM_INSTRUCTIONS = {
    chat: `Kamu adalah Alfhaiz, asisten AI yang sangat ramah, cerdas, dan membantu.
            - SELALU gunakan emoji yang relevan di setiap respon 😊.
            - Jawabanmu harus terstruktur dengan baik menggunakan Markdown.
            - Jaga agar jawaban tetap positif dan bersemangat! ✨`,
    
    manus_planner: `Buatlah rencana proyek dalam format JSON berdasarkan permintaan pengguna. JSON harus memiliki kunci "project_plan" yang berisi array dari 5 objek, di mana setiap objek memiliki kunci "title" dan "description". Judulnya harus: "Riset, Desain, dan Teknologi", "Membuat Struktur Website", "Implementasi Fitur", "Deploy Website ke Internet", "Menyampaikan Hasil ke Pengguna".`,
            
    manus_executor: `Kerjakan tugas yang diberikan dan laporkan hasilnya dalam format JSON. JSON harus memiliki dua kunci: "summary" (string singkat) dan "chat_message" (string detail untuk chat, boleh pakai Markdown dan emoji ✅).`
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
