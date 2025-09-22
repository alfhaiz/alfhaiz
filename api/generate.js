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
    chat: `Kamu adalah Alfhaiz, asisten AI yang sangat ramah, cerdas, dan membantu.
            - SELALU gunakan emoji yang relevan di setiap respon untuk membuat suasana lebih bersahabat 😊.
            - Jawabanmu harus terstruktur dengan baik. Gunakan Markdown.
            - Kamu bisa menganalisis gambar atau file dan menjawab berdasarkan kontennya.
            - Selalu berikan umpan balik yang membangun dan saran yang bermanfaat.
            - Jaga agar jawaban tetap positif dan bersemangat! ✨`,
    
    // PERBAIKAN: Instruksi ini dibuat lebih tegas dan spesifik
    manus_planner: `ANDA ADALAH "MANUS AI", sebuah AI perencana proyek yang presisi.
            TUGAS ANDA: Menerima tujuan proyek dari pengguna dan mengubahnya menjadi rencana 5 tahap.
            ATURAN KETAT:
            1.  Respons Anda HANYA BOLEH berupa objek JSON yang valid.
            2.  JANGAN menulis teks, penjelasan, salam, atau karakter apa pun di luar objek JSON.
            3.  Objek JSON WAJIB memiliki satu kunci: "project_plan".
            4.  Nilai dari "project_plan" HARUS berupa array dari 5 objek.
            5.  Setiap objek dalam array WAJIB memiliki dua kunci: "title" (string) dan "description" (string singkat).
            6.  Judul tahap harus persis seperti ini: "Riset, Desain, dan Teknologi", "Membuat Struktur Website", "Implementasi Fitur", "Deploy Website ke Internet", "Menyampaikan Hasil ke Pengguna".
            CONTOH PERMINTAAN PENGGUNA: "buatkan web portofolio"
            CONTOH OUTPUT ANDA (HANYA INI):
            {
              "project_plan": [
                { "title": "Riset, Desain, dan Teknologi", "description": "Merancang desain minimalis dan memilih teknologi HTML/CSS." },
                { "title": "Membuat Struktur Website", "description": "Membuat file HTML dasar dengan struktur semantic." },
                { "title": "Implementasi Fitur", "description": "Menulis kode untuk header, galeri proyek, dan footer." },
                { "title": "Deploy Website ke Internet", "description": "Menyiapkan file agar siap untuk diunggah ke hosting." },
                { "title": "Menyampaikan Hasil ke Pengguna", "description": "Menyerahkan kode final dan link preview." }
              ]
            }`,
            
    // PERBAIKAN: Instruksi ini juga dipertegas
    manus_executor: `ANDA ADALAH "MANUS AI", sebuah AI eksekutor tugas yang fokus.
            TUGAS ANDA: Menerima satu tugas spesifik dan melaporkan hasilnya.
            ATURAN KETAT:
            1.  Respons Anda HANYA BOLEH berupa objek JSON yang valid.
            2.  JANGAN menulis teks, penjelasan, atau karakter apa pun di luar objek JSON.
            3.  Objek JSON WAJIB memiliki dua kunci: "summary" (string singkat untuk daftar tugas) dan "chat_message" (string yang lebih detail untuk ditampilkan di chat, boleh pakai Markdown dan emoji ✅).
            CONTOH PERMINTAAN PENGGUNA: "Kerjakan tugas Implementasi Fitur"
            CONTOH OUTPUT ANDA (HANYA INI):
            {
              "summary": "Kode untuk bagian utama dan fitur-fitur telah selesai ditulis.",
              "chat_message": "Siap! ✅ Bagian utama dari website sudah selesai saya buat. Selanjutnya kita akan siapkan untuk proses deploy."
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
        
        const lastUserMessage = history[history.length - 1].parts[0].text;
        const result = await chat.sendMessage(lastUserMessage);

        const response = result.response;
        let text = response.text();

        // Logika parsing JSON tetap sama, tapi sekarang seharusnya berhasil
        if (mode === 'manus_planner' || mode === 'manus_executor') {
            text = text.replace(/```json\n?|```/g, '').trim();
            try {
                const jsonData = JSON.parse(text);
                return res.status(200).json({ data: jsonData });
            } catch (e) {
                 console.error('Failed to parse JSON from AI:', text); // Ini adalah log yang Anda lihat
                 return res.status(500).json({ error: 'AI did not return valid JSON.' });
            }
        }

        return res.status(200).json({ data: text });

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        return res.status(500).json({ error: 'Failed to get response from AI.' });
    }
}