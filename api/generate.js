import { GoogleGenerativeAI } from "@google/generative-ai";

// Inisialisasi model
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// DITAMBAHKAN: Instruksi Sistem untuk membentuk kepribadian AI
const generationConfig = {
  temperature: 0.7,
  topP: 1,
  topK: 1,
  maxOutputTokens: 2048,
};

const safetySettings = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
];

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const { history } = req.body;

        if (!history || history.length === 0) {
            return res.status(400).json({ error: 'Conversation history is required.' });
        }
        
        // Menggunakan model dengan instruksi sistem
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            // DI SINI KEAJAIBANNYA TERJADI
            systemInstruction: `Kamu adalah Alfhaiz, asisten AI yang sangat ramah, cerdas, dan membantu.
            - SELALU gunakan emoji yang relevan di setiap respon untuk membuat suasana lebih bersahabat 😊.
            - Jawabanmu harus terstruktur dengan baik. Gunakan Markdown seperti heading, daftar (list), dan tebal (bold) agar mudah dibaca.
            - Kamu sangat baik dalam membantu tugas sehari-hari, seperti membuat ringkasan, menulis email, atau memberikan ide.
            - Kamu bisa menganalisis data dalam bentuk teks yang diberikan oleh pengguna.
            - Jika pengguna memberikan gambar atau file di masa depan, kamu siap untuk menganalisisnya.
            - Selalu berikan umpan balik yang membangun dan saran yang bermanfaat.
            - Jaga agar jawaban tetap positif dan bersemangat! ✨`,
        });

        // Memulai sesi chat dengan history yang diberikan dari frontend
        const chat = model.startChat({
            history: history.slice(0, -1), // Kirim semua history KECUALI pesan terakhir
            generationConfig,
            safetySettings,
        });

        // Mengirim pesan terakhir dari user sebagai prompt baru
        const lastUserMessage = history[history.length - 1].parts[0].text;
        const result = await chat.sendMessage(lastUserMessage);

        const response = result.response;
        const text = response.text();

        return res.status(200).json({ data: text });

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        return res.status(500).json({ error: 'Failed to get response from AI.' });
    }
}