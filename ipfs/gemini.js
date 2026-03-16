import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_KEY });

async function aires(prompt) {
    if (!prompt) return { steps: {} };

    const prefixPrompt = `
You are a cybersecurity assistant specialized in defence personnel protection. 
... (keep your full prompt as-is) ...
make your response small and concise. 
Give the output in JSON like this: 
{ "steps": { "1": "step 1", "2": "step 2" } } 
Do not include any text outside JSON.
`;

    const finalPrompt = prefixPrompt + "\n" + prompt;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ type: "text", text: finalPrompt }],
        });

        let output = response?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

        // Remove any code fences or extra text Gemini might include
        output = output.replace(/```json|```/g, "").trim();

        // Extract JSON only (in case there’s extra text)
        const match = output.match(/\{[\s\S]*\}/);
        if (match) output = match[0];

        // Parse safely
        let jsonOutput = {};
        try {
            jsonOutput = JSON.parse(output);
        } catch (e) {
            console.error("Failed to parse JSON from Gemini:", output);
            jsonOutput = { steps: {} };
        }

        return jsonOutput;

    } catch (err) {
        console.error("Error calling Gemini API:", err);
        return { steps: {} };
    }
}

export default aires;
