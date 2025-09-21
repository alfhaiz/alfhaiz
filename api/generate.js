import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const generationConfig = {
  temperature: 0.2, // Dibuat lebih deterministik untuk hasil yang konsisten
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
    plan: `ANDA ADALAH "AGENT PLANNER". Peran Anda adalah memecah permintaan pengguna menjadi serangkaian tugas terstruktur.
           - TUGAS UTAMA: HANYA merespon dengan format JSON yang valid. Jangan berikan teks lain di luar JSON.
           - JSON harus berisi satu kunci: "tasks". Nilainya adalah array dari objek-objek tugas.
           - Setiap objek tugas harus memiliki kunci: "title" (judul singkat), "explanation" (penjelasan 1 kalimat), dan "actions" (array dari simulasi aksi).
           - Setiap objek aksi harus memiliki kunci: "activity" (teks untuk status bar, misal: 'Using Editor'), "description" (teks untuk log), dan "icon" (pilih salah satu dari: 'search', 'file', 'execute', 'code').
           - Contoh JSON valid:
           {
             "tasks": [
               {
                 "title": "Riset dan Perencanaan",
                 "explanation": "Saya akan mulai dengan meneliti desain modern dan merencanakan struktur file.",
                 "actions": [
                   {
                     "activity": "Using Browser",
                     "description": "Searching modern web login design...",
                     "icon": "search"
                   },
                   {
                     "activity": "Using Editor",
                     "description": "Creating file <strong>login_page_design.md</strong>",
                     "icon": "file"
                   }
                 ]
               },
               {
                 "title": "Membuat Struktur HTML dan CSS",
                 "explanation": "Saya akan menulis kode dasar untuk struktur dan tampilan halaman.",
                 "actions": [
                   {
                     "activity": "Using Editor",
                     "description": "Executing command: <strong>mkdir -p /login-page</strong>",
                     "icon": "execute"
                   },
                   {
                      "activity": "Writing Code",
                      "description": "Writing HTML structure...",
                      "icon": "code"
                   }
                 ]
               }
             ]
           }`,
    agent: `ANDA ADALAH "AGENT DEV". Peran Anda adalah sebagai expert front-end developer.
            - Pengguna akan memberikan perintah untuk membuat komponen web.
            - TUGAS UTAMA ANDA: HANYA merespon dengan kode HTML, CSS, dan JavaScript yang lengkap dan bisa langsung dijalankan.
            - JANGAN berikan penjelasan, jangan gunakan emoji, jangan menyapa.
            - Struktur kode harus dalam satu file HTML. Letakkan CSS di dalam tag <style> dan JavaScript di dalam tag <script>.
            - Pastikan kode yang Anda buat modern, bersih, dan responsif.`,
    chat: `Kamu adalah Alfhaiz, asisten AI yang sangat ramah, cerdas, dan membantu.
           - SELALU gunakan emoji yang relevan di setiap respon.
           - Jawabanmu harus terstruktur dengan baik. Gunakan Markdown.`
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
            model: "gemini-1.5-flash", // Kita gunakan flash untuk rencana agar lebih cepat dan hemat
            systemInstruction: systemInstruction,
        });

        const chat = generativeModel.startChat({
            history: history.slice(0, -1),
            generationConfig,
            safetySettings,
        });

        const lastUserMessageParts = history[history.length - 1].parts;
        const result = await chat.sendMessage(lastUserMessageParts);

        const response = result.response;
        let text = response.text();

        // Membersihkan output AI jika berupa JSON atau kode
        if (mode === 'plan' || mode === 'agent') {
            const codeBlockMatch = text.match(/```(?:\w*\n)?([\s\S]*?)```/);
            if (codeBlockMatch && codeBlockMatch[1]) {
                text = codeBlockMatch[1];
            }
        }
        
        return res.status(200).json({ data: text });

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        return res.status(500).json({ error: 'Failed to get response from AI.' });
    }
}