import { GoogleGenAI } from "@google/genai";
import 'dotenv/config';
import express from 'express';
import multer from "multer";
import cors from "cors";


// console.log(interaction.output_text);
const model = process.env.MODEL;
const key = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({
    apiKey: key,
});

const app = express();
const upload = multer();

const port = 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello Fadhil Ferdian!');
});

app.post('/generate-text', async(req, res) => {
    try {
        const { prompt } = req.body;
        console.log(prompt, '<<prompt');
        console.log(key, '<<key');
        const response = await ai.interactions.create({
    model: model,
    input: prompt,
    });

    res.status(200).json({
            output: response.output_text,
    });

    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating text')
    }
})
app.post('/generate-from-document', upload.single('file'), async(req, res) => {
    try{
        const {prompt} = req.body;
        const fileBase64 = req.file.buffer.toString('base64');
        const response = await ai.models.generateContent({
          model: model,
          contents: [
            prompt,
            {
                inlineData: {
                    mimeType: req.file.mimetype,
                    data: fileBase64,
                }
            }
          ]
        });

    res.status(200).json({
        output: response.text
    });
    } catch(error){
        console.error(error);
        res.status(500).send('Error generating text')
    }
})

app.post('/api/chat', async(req, res) => {
    const { conversation } = req.body;
    console.log('Received chat request. Conversation length:', conversation?.length);

    // validate if the conversation is an array
    try {
        if (!Array.isArray(conversation)) {
            throw new Error('Conversation must be an array');
        }

        // mapping the conversation to the format required by Gemini API        
        const contents = conversation.map(({ role, text }) => ({
            role,
            parts: [{ text }],
        }));

        const response = await ai.models.generateContent({
            model,
            contents,
            config: {
                temperature: 0.2, // reduce randomness in the output, because this is a company chatbot, we want to be more deterministic
                systemInstruction: `Kamu adalah "Faidah Arabic Bot", asisten virtual super ramah, penuh semangat, dan profesional dari Faidah Arabic Course.
                                    Gaya bahasamu adalah gaya anak kajian yang santai, kekinian, namun tetap santun (menggunakan sapaan seperti "Antum/Antunna", "Akhi/Ukhti", "Sahabat Faidah"). 
                                    Kamu harus selalu memancarkan energi positif dan memotivasi mereka bahwa belajar bahasa Arab itu mudah, seru, dan berfaidah besar untuk memahami Al-Qur'an serta tholabul 'ilmi.
                                    - Nama: Faidah Arabic Course
                                    - Alamat: Jl. Madirsan, Tanjung Morawa
                                    - Nomor Admin: 085275600290
                                    - Keunggulan: Metode praktis, interaktif, cocok untuk kesibukan harian, dan dibimbing sampai bisa.
                                    1. TONALITAS: Gunakan emoji yang relevan (✨, 🚀, 📚, 💬, 🙏) agar chat terasa hidup dan tidak kaku. Gunakan istilah ringan khas kajian seperti: "Barakallahu fiik", "Insyaallah", "Maa syaa Allah", "Tholabul 'ilmi", "Semangat ya!".
                                    2. RESPONS: Singkat, padat, informatif, dan langsung menjawab esensi pertanyaan. Jangan berbelit-belit.
                                    3. CALL TO ACTION (CTA) MANDATORI: Di SETIAP akhir respons (tanpa kecuali), kamu WAJIB menyisipkan ajakan hangat namun persuasif untuk melanjutkan obrolan atau pendaftaran langsung ke WhatsApp Admin (misal: untuk klaim promo, tanya jadwal, atau langsung amankan slot belajar).
                                    4. Menyapa: "Masyaallah, ahlan wa sahlan Akhi/Ukhti! ✨ Seneng banget bisa nemenin Antum di Faidah Arabic Course. Ada yang bisa kita bantu hari ini buat mulai perjalanan mulia belajar bahasa Al-Qur'an? 🚀"
                                    5. Menjawab Fasilitas: "Tenang aja Sahabat Faidah, metode kita didesain santai tapi terstruktur banget, cocok buat yang super sibuk! Kelas kita berlokasi di Jl. Madirsan, Tanjung Morawa, tapi slotnya emang rebutan banget nih. 📚"
                                    6. CTA ke WhatsApp: "Biar makin jelas dan Antum bisa langsung amankan kuota kelas terdekat (plus dapet info promo menarik bulan ini), yuk langsung klik atau chat Admin kita di WhatsApp ya! Hubungi kami di: [https://wa.me/6285275600290]. Ditunggu di sana ya, barakallahu fiik! 🙏"
                                    7. Jangan memberikan detail harga atau jadwal yang terlalu rigid secara spekulatif. Jika ditanya detail teknis pendaftaran, katakan bahwa info paling update dan akurat ada di tangan Admin WhatsApp.
                                    8. Jika ada pertanyaan di luar topik bahasa Arab atau program Faidah Arabic Course, kembalikan percakapan ke topik belajar bahasa Arab dengan sopan.`,
            },
        });

        res.status(200).json({
            output: response.text
        });
    } catch(error){
        console.error(error);
        res.status(500).send('Error generating text')
    }
})

app.listen(port, () => {
  console.log(`Server berjalan di port ${port}`);
});