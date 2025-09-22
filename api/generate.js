import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const generationConfig = {
  temperature: 0.5, // Sedikit menurunkan temperatur untuk mengurangi "kreativitas"
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
            - SELALU gunakan emoji yang relevan di setiap respon untuk membuat suasana lebih bersahabat 😊.
            - Jawabanmu harus terstruktur dengan baik. Gunakan Markdown.
            - Jaga agar jawaban tetap positif dan bersemangat! ✨`,
    
    // Instruksi paling tegas
    manus_planner: `PERINTAH TEGAS: HANYA output objek JSON. TANPA teks lain. TANPA sapaan. TANPA penjelasan.
            Struktur JSON: { "project_plan": [ { "title": "...", "description": "..." }, ... (total 5 objek) ] }
            Judul tahap harus persis: "Riset, Desain, dan Teknologi", "Membuat Struktur Website", "Implementasi Fitur", "Deploy Website ke Internet", "Menyampaikan Hasil ke Pengguna".`,
            
    manus_executor: `PERINTAH TEGAS: HANYA output objek JSON. TANPA teks lain. TANPA sapaan. TANPA penjelasan.
            Struktur JSON: { "summary": "...", "chat_message": "..." }`
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

        // --- INI ADALAH BAGIAN PERBAIKAN UTAMA ---
        if (mode === 'manus_planner' || mode === 'manus_executor') {
            // 1. Cari blok JSON di dalam teks, bahkan jika ada teks lain
            const jsonRegex = /\{[\s\S]*\}/;
            const match = text.match(jsonRegex);

            if (match) {
                try {
                    // 2. Jika ditemukan, coba parse blok JSON tersebut
                    const jsonData = JSON.parse(match[0]);
                    return res.status(200).json({ data: jsonData });
                } catch (e) {
                    console.error('AI returned a malformed JSON object:', match[0]);
                    return res.status(500).json({ error: 'AI mengembalikan objek JSON yang rusak.' });
                }
            } else {
                // 3. Jika tidak ada blok JSON sama sekali
                console.error('AI did not return any JSON object:', text);
                return res.status(500).json({ error: 'AI tidak mengembalikan JSON yang valid.' });
            }
        }

        // Untuk mode chat biasa, kembalikan teks seperti biasa
        return res.status(200).json({ data: text });

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        return res.status(500).json({ error: 'Gagal memanggil API AI.' });
    }
          }
