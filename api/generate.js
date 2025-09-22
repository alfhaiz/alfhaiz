import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// Menggunakan `@google/generative-ai` versi terbaru,
// `GoogleGenerativeAIExtension` tidak lagi diperlukan
// karena fungsionalitas tool calling sudah ada di kelas utama.

// Inisialisasi genAI dengan API Key Gemini
// Vercel akan secara otomatis menyediakan process.env.GEMINI_API_KEY dari environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const generationConfig = {
  temperature: 0.7,
  topP: 0.95, // Sedikit disesuaikan untuk respons yang lebih fokus
  topK: 40,   // Sedikit disesuaikan
  maxOutputTokens: 8192,
};

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

const SYSTEM_INSTRUCTIONS = `Kamu adalah Alfhaiz, asisten AI yang sangat ramah, cerdas, dan membantu.
- SELALU gunakan emoji yang relevan di setiap respon untuk membuat suasana lebih bersahabat 😊.
- Jawabanmu harus terstruktur dengan baik dan mudah dibaca. Gunakan Markdown.
- Kamu bisa menganalisis gambar atau file dan menjawab berdasarkan kontennya.
- Selalu berikan umpan balik yang membangun dan saran yang bermanfaat.
- Jaga agar jawaban tetap positif dan bersemangat! ✨
- Jika kamu tidak memiliki informasi terbaru atau merasa perlu mencari data dari internet untuk memberikan jawaban terbaik, **gunakan fungsi 'google_search' secara otomatis**.
- Saat menggunakan 'google_search', tentukan query pencarian yang tepat dan informatif.
- Setelah memberikan jawaban yang relevan (terutama jika hasil pencarian digunakan), **SELALU sertakan link sumber dari hasil Google Search yang kamu gunakan di bagian akhir jawaban**.
- Format link sumber sebagai daftar bullet point dengan judul dan URL. Jika tidak ada hasil yang relevan, jangan sertakan bagian sumber.
- Contoh format sumber (harus berada di bagian paling akhir respons setelah teks utama):
---
Sumber:
- [Judul Artikel 1](URL Artikel 1)
- [Judul Artikel 2](URL Artikel 2)
---
`;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const { history, model } = req.body;

        if (!history || history.length === 0) {
            return res.status(400).json({ error: 'Conversation history is required.' });
        }
        
        // Ambil Google Search API Key dan CX dari environment variables
        const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
        const GOOGLE_SEARCH_CX = process.env.GOOGLE_SEARCH_CX;

        // Validasi keberadaan kunci API untuk Google Search
        if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_CX) {
            console.error("GOOGLE_SEARCH_API_KEY atau GOOGLE_SEARCH_CX tidak diatur dalam environment variables.");
            return res.status(500).json({ error: 'Server configuration error: Google Search API keys are missing.' });
        }

        // Inisialisasi model Generative AI dengan tools
        // Fungsi tool calling kini terintegrasi langsung di kelas GoogleGenerativeAI
        const generativeModel = genAI.getGenerativeModel({ 
            model: model || "gemini-2.5-flash", // Default ke model pro terbaru
            systemInstruction: SYSTEM_INSTRUCTIONS,
            tools: [{
                functionDeclarations: [
                    {
                        name: "google_search",
                        description: "Search Google for up-to-date information on any topic. This tool should be used when current information is required or when the internal knowledge base is insufficient.",
                        parameters: {
                            type: "object",
                            properties: {
                                query: {
                                    type: "string",
                                    description: "The search query to use. Be specific and concise."
                                }
                            },
                            required: ["query"]
                        }
                    }
                ]
            }]
        });

        const chat = generativeModel.startChat({
            history: history.slice(0, -1), // Kirim semua history kecuali pesan terakhir
            generationConfig,
            safetySettings,
        });

        const lastUserMessageParts = history[history.length - 1].parts;
        const result = await chat.sendMessage(lastUserMessageParts);

        // Loop untuk menangani panggilan fungsi berantai (jika ada)
        let responseContent = result.response;
        let finalResponseText = "";
        let finalSourceLinks = [];

        while (responseContent.functionCall) {
            const functionCall = responseContent.functionCall;
            if (functionCall.name === "google_search") {
                const searchQuery = functionCall.args.query;
                console.log("AI memanggil Google Search dengan query:", searchQuery);

                let searchResults = [];
                try {
                    const googleSearchResponse = await fetch(`https://www.googleapis.com/customsearch/v1?key=${GOOGLE_SEARCH_API_KEY}&cx=${GOOGLE_SEARCH_CX}&q=${encodeURIComponent(searchQuery)}`);
                    
                    if (!googleSearchResponse.ok) {
                        const errorData = await googleSearchResponse.json();
                        console.error("Google Search API returned an error:", errorData);
                        throw new Error(`Google Search API error: ${googleSearchResponse.statusText}`);
                    }

                    const searchData = await googleSearchResponse.json();
                    if (searchData.items && searchData.items.length > 0) {
                        // Ambil hingga 5 hasil teratas untuk konteks dan sumber
                        searchResults = searchData.items.slice(0, 5).map(item => ({ title: item.title, url: item.link, snippet: item.snippet }));
                    } else {
                        searchResults = []; // Tidak ada hasil
                    }
                } catch (searchError) {
                    console.error("Error fetching from Google Search API:", searchError);
                    searchResults = [{ title: "Pencarian gagal atau tidak ada hasil.", url: "#", snippet: "Tidak dapat mengambil informasi dari Google. Mungkin terjadi masalah jaringan atau query tidak menghasilkan hasil." }];
                }
                
                // Kirim hasil pencarian kembali ke model
                // Model akan menggunakan 'results' ini untuk merangkum dan menyertakan link
                const toolResponse = await chat.sendMessage([
                    {
                        functionResponse: {
                            name: "google_search",
                            response: {
                                results: searchResults.map(r => ({
                                    title: r.title, 
                                    url: r.url, 
                                    snippet: r.snippet // Beri model snippet untuk merangkum
                                }))
                            }
                        }
                    }
                ]);
                responseContent = toolResponse.response; // Update responseContent untuk iterasi berikutnya
                
            } else {
                return res.status(500).json({ error: 'Unsupported function call: ' + functionCall.name });
            }
        }

        // Ambil teks final dari respons
        finalResponseText = responseContent.text();

        // Ekstrak sumber dari teks jika ada
        const textParts = finalResponseText.split('---');
        let mainText = textParts[0].trim();
        if (textParts.length > 1) {
            const sourcesBlock = textParts[1].replace('Sumber:', '').trim();
            const urlRegex = /\[(.*?)\]\((https?:\/\/[^\s]+)\)/g;
            let match;
            while ((match = urlRegex.exec(sourcesBlock)) !== null) {
                finalSourceLinks.push({
                    title: match[1],
                    url: match[2]
                });
            }
        }
        
        return res.status(200).json({ data: mainText, sources: finalSourceLinks });

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        // Pertimbangkan untuk memberikan pesan kesalahan yang lebih spesifik
        if (error.message.includes('API key not valid') || error.message.includes('API key not found')) {
            return res.status(401).json({ error: 'Gemini API Key tidak valid atau tidak ditemukan. Mohon periksa konfigurasi Environment Variables Anda di Vercel.' });
        }
        if (error.message.includes('User blocked content')) {
            return res.status(400).json({ error: 'Konten Anda diblokir karena tidak sesuai dengan kebijakan keselamatan. Mohon gunakan bahasa yang lebih sopan. 🙏' });
        }
        return res.status(500).json({ error: `Gagal mendapatkan respons dari AI. Coba lagi nanti. 😔 Detail: ${error.message}` });
    }
}