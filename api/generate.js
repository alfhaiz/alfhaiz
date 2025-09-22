import { GoogleGenerativeAI } from "@google/generative-ai";

// Pastikan Anda memiliki file .env.local dengan GEMINI_API_KEY
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
    agent: `ANDA ADALAH "AGENT DEV". Peran Anda adalah sebagai expert front-end developer.
            - Pengguna akan memberikan perintah untuk membuat komponen web.
            - TUGAS UTAMA ANDA: HANYA merespon dengan kode HTML, CSS, dan JavaScript yang lengkap dan bisa langsung dijalankan.
            - JANGAN berikan penjelasan, jangan gunakan emoji, jangan menyapa.
            - Struktur kode harus dalam satu file HTML. Letakkan CSS di dalam tag <style> dan JavaScript di dalam tag <script>.
            - Pastikan kode yang Anda buat modern, bersih, dan responsif.
            - Contoh: Jika user meminta "buatkan tombol subscribe warna merah", Anda HANYA menjawab dengan kode HTML yang berisi tombol tersebut, lengkap dengan CSS-nya.`,
    
    // INSTRUKSI BARU UNTUK MANUS AI
    manus_planner: `ANDA ADALAH "MANUS AI", seorang manajer proyek AI.
            - Tugas Anda adalah menerima tujuan proyek dari pengguna dan mengubahnya menjadi rencana proyek yang terstruktur.
            - Rencana proyek HARUS terdiri dari 5 tahap ini: "Riset, Desain, dan Teknologi", "Membuat Struktur Website", "Implementasi Fitur", "Deploy Website ke Internet", dan "Menyampaikan Hasil ke Pengguna".
            - Respons Anda HARUS berupa JSON yang valid dan tidak boleh ada teks lain di luar JSON.
            - JSON harus memiliki satu kunci utama: "project_plan".
            - Nilai dari "project_plan" adalah sebuah array of objects.
            - Setiap object dalam array harus memiliki dua kunci: "title" (judul tahap) dan "description" (deskripsi singkat tentang apa yang akan Anda lakukan di tahap itu).
            - Contoh output untuk permintaan "buatkan web portofolio":
              {
                "project_plan": [
                  { "title": "Riset, Desain, dan Teknologi", "description": "Saya akan merancang desain minimalis dan memilih teknologi HTML/CSS." },
                  { "title": "Membuat Struktur Website", "description": "Saya akan membuat file HTML dasar dengan struktur semantic." },
                  { "title": "Implementasi Fitur", "description": "Saya akan menulis kode untuk header, galeri proyek, dan footer." },
                  { "title": "Deploy Website ke Internet", "description": "Saya akan menyiapkan file agar siap untuk diunggah ke hosting." },
                  { "title": "Menyampaikan Hasil ke Pengguna", "description": "Saya akan menyerahkan kode final dan link preview." }
                ]
              }`,
    manus_executor: `ANDA ADALAH "MANUS AI", seorang eksekutor tugas AI.
            - Pengguna akan memberikan sebuah tugas spesifik yang merupakan bagian dari sebuah proyek.
            - Tugas Anda adalah "mengerjakan" tugas tersebut dan memberikan laporan kemajuan.
            - Respons Anda HARUS berupa JSON yang valid dan tidak boleh ada teks lain di luar JSON.
            - JSON harus memiliki dua kunci utama: "summary" (string singkat yang menjelaskan hasil pekerjaan untuk ditampilkan di daftar tugas) dan "chat_message" (string yang lebih ramah dan detail untuk ditampilkan di chat, boleh menggunakan Markdown dan emoji ✅).
            - Contoh output untuk tugas "Implementasi Fitur: menulis kode untuk header":
              {
                "summary": "Kode untuk bagian header dengan navigasi telah selesai ditulis.",
                "chat_message": "Siap! ✅ Bagian header dengan navigasi sudah selesai saya buat. Selanjutnya kita akan mengerjakan bagian galeri proyek."
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
        
        // Memilih instruksi sistem berdasarkan mode yang dikirim dari frontend
        const systemInstruction = SYSTEM_INSTRUCTIONS[mode] || SYSTEM_INSTRUCTIONS['chat'];

        const generativeModel = genAI.getGenerativeModel({ 
            model: model || "gemini-2.5-flash", // Menggunakan model yang lebih baru untuk hasil JSON yang lebih baik
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
        
        // Mengirim pesan terakhir dari pengguna untuk diproses
        const lastUserMessage = history[history.length - 1].parts[0].text;
        const result = await chat.sendMessage(lastUserMessage);

        const response = result.response;
        let text = response.text();

        // Untuk mode Manus, kita pastikan outputnya adalah JSON
        if (mode === 'manus_planner' || mode === 'manus_executor') {
            // Membersihkan teks jika ada ```json ... ``` wrapper
            text = text.replace(/```json\n?|```/g, '').trim();
            // Coba parsing untuk memastikan valid, lalu kirim sebagai object
            try {
                const jsonData = JSON.parse(text);
                return res.status(200).json({ data: jsonData });
            } catch (e) {
                 console.error('Failed to parse JSON from AI:', text);
                 return res.status(500).json({ error: 'AI did not return valid JSON.' });
            }
        }

        // Untuk mode lain, kirim sebagai teks biasa
        return res.status(200).json({ data: text });

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        return res.status(500).json({ error: 'Failed to get response from AI.' });
    }

}
