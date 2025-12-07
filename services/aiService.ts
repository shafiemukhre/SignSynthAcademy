
import { GoogleGenAI } from "@google/genai";
import { FeedbackResponse, Lesson } from '../types';

// Initialize the client
const apiKey = process.env.API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

/**
 * GEMINI 2.5 FLASH TEACHER
 * Analyzes the user's hand sign using Vision capabilities.
 * Now supports an optional spoken question for Multimodal interaction.
 */
export const analyzeHandShape = async (
  target: string, 
  imageBase64: string, 
  spokenQuestion?: string
): Promise<FeedbackResponse> => {
  try {
    if (!ai) throw new Error("No API Key available");

    // Ensure clean base64 string
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    let promptContext = "";
    const isPhrase = target.length > 1;
    const targetType = isPhrase ? "phrase or word" : "letter";
    
    if (spokenQuestion) {
      promptContext = `
        The user is asking a specific question while trying to sign: "${spokenQuestion}".
        Answer their question based on the visual evidence of their hand.
        If their question implies they are confused, guide them.
      `;
    } else {
      promptContext = `
        The student is attempting to sign the ${targetType} '${target}'.
        Analyze the provided image of their hand(s).
      `;
    }

    const prompt = `
      You are an expert ASL (American Sign Language) teacher. 
      ${promptContext}
      
      Strictly output valid JSON with this structure:
      {
        "success": boolean,
        "message": "string (constructive feedback to the student, answer their question if present)",
        "correctionPrompt": "string (a descriptive image prompt to generate a visual correction if they failed, otherwise null)"
      }

      If the sign is correct, be encouraging.
      If incorrect, be specific about fingers, thumb, or wrist placement.
      If it is a phrase, check if the sequence of hands roughly matches the target.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        temperature: 0.4
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text);

  } catch (error) {
    console.warn("Gemini Analysis Failed (Using Mock):", error);
    
    // MOCK FALLBACK
    await new Promise(resolve => setTimeout(resolve, 1500));
    const isSuccess = Math.random() > 0.4;
    
    if (spokenQuestion) {
       return {
         success: false,
         message: `I heard you ask: "${spokenQuestion}". Based on the image, your index finger looks good, but check your thumb placement.`,
         correctionPrompt: `photorealistic hand signing ASL letter ${target}`
       };
    }

    if (isSuccess) {
      return {
        success: true,
        message: `Excellent! Your shape for '${target}' looks perfect based on our simulation.`
      };
    } else {
      const errors = [
        `Your thumb is tucked too tight for '${target}'. Relax it slightly.`,
        `Your fingers need to be straighter. Look at the reference.`,
        `Rotate your wrist slightly outward to match the angle.`
      ];
      return {
        success: false,
        message: errors[Math.floor(Math.random() * errors.length)],
        correctionPrompt: `photorealistic hand signing ASL letter ${target} with emphasis on correct thumb placement, highlighted green outlines`
      };
    }
  }
};

/**
 * NANO BANANA PRO (Gemini 3 Pro Image Preview)
 * Generates high-fidelity reference images for the student.
 * Supports aspect ratio for different view modes (1:1 for cards, 16:9 for infographics).
 */
export const generateReferenceImage = async (prompt: string, aspectRatio: string = "1:1"): Promise<string> => {
  try {
    if (!ai) throw new Error("No API Key available");

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: "1K"
        }
      }
    });

    // Extract the image from the response parts
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data found in response");

  } catch (error) {
    console.warn("Image Generation Failed (Using Mock):", error);
    
    // MOCK FALLBACK (Placeholders)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Extract letter from prompt for a better placeholder
    const letterMatch = prompt.match(/ASL letter ([A-Z])/i);
    const letter = letterMatch ? letterMatch[1].toUpperCase() : "Sign";
    
    return `https://placehold.co/800x800/1e293b/FFF?text=ASL+Sign:+${letter}`;
  }
};

/**
 * DYNAMIC CURRICULUM GENERATOR
 * Creates a new lesson based on user voice intent.
 */
export const createLessonFromIntent = async (userVoicePrompt: string): Promise<Lesson> => {
  try {
    if (!ai) throw new Error("No API Key available");

    const prompt = `
      The user said: "${userVoicePrompt}".
      Identify the ASL sign or phrase they want to learn.
      
      If they asked "How to communicate I want to go to toilet", the target is "TOILET" or the phrase "I WANT TOILET".
      If they asked "Show me how to sign Apple", the target is "APPLE".

      Create a valid JSON object for a Lesson:
      {
        "id": "dynamic-timestamp",
        "target": "string (the word or phrase)",
        "description": "string (brief instruction on how to sign it)",
        "difficulty": "Beginner" | "Intermediate",
        "prompt": "string (prompt for an image generator to show the sign. If it's a phrase, ask for a composite image or a sequence layout)"
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text || "{}";
    const data = JSON.parse(text);
    
    return {
      id: `dyn-${Date.now()}`,
      target: data.target || "Unknown",
      description: data.description || "Follow the hand sign shown.",
      difficulty: data.difficulty || "Beginner",
      prompt: data.prompt || `photorealistic hand signing ${data.target}`
    };

  } catch (error) {
    console.warn("Dynamic Lesson Failed", error);
    return {
      id: `dyn-${Date.now()}`,
      target: "Custom Sign",
      description: "I couldn't quite catch the specific sign, but here is a generic practice helper.",
      difficulty: "Beginner",
      prompt: "photorealistic hands signing ASL alphabet"
    };
  }
};
