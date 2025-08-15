import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '')

export const GEMINI_MODELS = {
  GEMINI_1_5_PRO: 'gemini-1.5-pro',
  GEMINI_1_5_FLASH: 'gemini-1.5-flash',
  GEMINI_1_0_PRO: 'gemini-1.0-pro',
}

export const DEFAULT_GEMINI_MODEL = GEMINI_MODELS.GEMINI_1_5_FLASH

export function getGeminiModel(modelName = DEFAULT_GEMINI_MODEL) {
  return genAI.getGenerativeModel({ model: modelName })
}

export function convertToGeminiFormat(messages) {
  return messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }))
}

export async function* streamGeminiResponse(response) {
  for await (const chunk of response.stream) {
    const text = chunk.text()
    if (text) {
      yield text
    }
  }
}

export { genAI }