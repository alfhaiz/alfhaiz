import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const generationConfig = {
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
    chat: `Anda adalah Alfhaiz, asisten AI yang sangat ramah, cerdas, dan membantu.
            - SELALU gunakan emoji yang relevan di setiap respon untuk membuat suasana lebih bersahabat  .
            - Jawabanmu harus terstruktur dengan baik. Gunakan Markdown.
            - Kamu bisa menganalisis gambar atau file dan menjawab berdasarkan kontennya.
            - Selalu berikan umpan balik yang membangun dan saran yang bermanfaat.
            - Jaga agar jawaban tetap positif dan bersemangat!  `,
    agent: `PERAN ANDA: Expert front-end developer.
TUGAS ANDA: Merespon HANYA dengan kode HTML, CSS, dan JavaScript yang lengkap dan bisa langsung dijalankan.
ATURAN:
- JANGAN berikan penjelasan.
- JANGAN gunakan emoji.
- JANGAN menyapa atau menulis teks apapun di luar kode.
- Struktur kode harus dalam satu file HTML. Letakkan CSS di dalam tag <style> dan JavaScript di dalam tag <script>.
- Pastikan kode modern, bersih, dan responsif.`
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
        
        const systemInstruction = SYSTEM_INSTRUCTIONS[mode] || SYSTEM_INSTRUCTIONS['chat'];

        const generativeModel = genAI.getGenerativeModel({ 
            model: model || "gemini-2.5-flash",
            systemInstruction: {
                role: "model",
                parts: [{ text: systemInstruction }]
            },
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