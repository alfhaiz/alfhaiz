import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// Inisialisasi dengan API Key Anda dari Vercel Environment Variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

export default async function handler(req, res) {
    // Hanya izinkan metode POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    try {
        const { prompt, model } = req.body;

        // Validasi input
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }
        
        if (model !== "gemini-2.5-flash-image-preview") {
            return res.status(400).json({ error: `Model ${model} is not supported for image generation.` });
        }

        // Inisialisasi model khusus untuk gambar
        const generativeModel = genAI.getGenerativeModel({ 
            model: model,
            safetySettings
        });

        // Panggil API untuk membuat gambar
        const result = await generativeModel.generateContent(prompt);
        const response = result.response;
        const imageUrl = response.text();

        // Validasi output dari Gemini
        if (!imageUrl || !imageUrl.startsWith('http')) {
            console.error("Gemini did not return a valid image URL. Response:", imageUrl);
            throw new Error("Gagal mendapatkan URL gambar yang valid dari model AI. Coba prompt yang berbeda.");
        }

        // Kirim URL gambar kembali ke frontend jika berhasil
        return res.status(200).json({
            success: true,
            imageUrl: imageUrl,
        });

    } catch (error) {
        console.error('Error in /api/generate-image:', error);
        // Berikan pesan error yang lebih informatif ke frontend
        return res.status(500).json({ error: `Gagal membuat gambar. Detail: ${error.message}` });
    }
}