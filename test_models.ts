import { GoogleGenAI } from "@google/genai";
async function list() {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.list();
    for await (const model of response) {
        console.log(model.name);
    }
}
list();
