// File: api/generate.js

export default async function handler(req, res) {
  // Hanya izinkan metode POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { prompt } = req.body;

    // Validasi input
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Input "prompt" dibutuhkan dan harus berupa string.' });
    }

    // =======================================================
    // == DI SINI KITA AKAN MENAMBAHKAN KONEKSI KE GEMINI API ==
    // =======================================================

    // Untuk sekarang, kita kembalikan respons palsu untuk pengujian
    const dummyResponse = `Ini adalah respons AI untuk prompt: "${prompt}"`;

    return res.status(200).json({ data: dummyResponse });

  } catch (error) {
    console.error('Terjadi kesalahan di server:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan internal pada server.' });
  }
}
