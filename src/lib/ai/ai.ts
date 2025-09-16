import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import app from '../firebase';
import { entrySchema } from './schemas';

export const ai = getAI(app, { backend: new GoogleAIBackend() });

export const getEntryParserModel = () => {
  return getGenerativeModel(ai, { 
    model: "gemini-2.5-flash-lite",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: entrySchema
    }
  });
};