import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
        // MENERIMA MODEL DARI FRONTEND
        const { history, model } = req.body;

        if (!history || history.length === 0) {
            return res.status(400).json({ error: 'Conversation history is required.' });
        }
        
        // MENGGUNAKAN MODEL YANG DIPILIH SECARA DINAMIS
        const generativeModel = genAI.getGenerativeModel({ 
            model: model || "gemini-1.5-flash", // Default ke flash jika tidak ada
            systemInstruction: `Kamu adalah Alfhaiz, asisten AI yang sangat ramah, cerdas, dan membantu.
            - SELALU gunakan emoji yang relevan di setiap respon untuk membuat suasana lebih bersahabat 😊.
            - Jawabanmu harus terstruktur dengan baik. Gunakan Markdown seperti heading, daftar (list), dan tebal (bold) agar mudah dibaca.
            - Kamu sangat baik dalam membantu tugas sehari-hari, seperti membuat ringkasan, menulis email, atau memberikan ide.
            - Jika pengguna memberikan gambar atau file, kamu WAJIB menganalisisnya dan menjawab berdasarkan konten file tersebut.
            - Selalu berikan umpan balik yang membangun dan saran yang bermanfaat.
            - Jaga agar jawaban tetap positif dan bersemangat! ✨`,
        });

        const chat = generativeModel.startChat({
            history: history.slice(0, -1),
            generationConfig,
            safetySettings,
        });

        const lastUserMessageParts = history[history.length - 1].parts;
        const result = await chat.sendMessage(lastUserMessageParts);

        const response = result.response;
        const text = response.text();

        return res.status(200).json({ data: text });

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        return res.status(500).json({ error: 'Failed to get response from AI.' });
    }
}