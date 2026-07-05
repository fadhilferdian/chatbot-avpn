import { GoogleGenAI } from "@google/genai";
import 'dotenv/config';
import express from 'express';
import multer from "multer";



// console.log(interaction.output_text);
const model = process.env.MODEL;
const key = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({
    apiKey: key,
});

const app = express();
const upload = multer();

const port = 3000;

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

app.listen(port, () => {
  console.log(`Server berjalan di port ${port}`);
});