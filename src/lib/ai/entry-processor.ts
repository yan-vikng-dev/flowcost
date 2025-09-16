import { CATEGORY_NAMES } from '@/types/category';
import { getEntryParserModel } from './ai';
import { getEntriesSummary } from '@/services/entries';

// Convert a File to an inline data part for the model
const fileToPart = (file: File) => new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve({ inlineData: { data: (reader.result as string).split(',')[1], mimeType: file.type } });
  reader.readAsDataURL(file);
});

const getAnalysisPrompt = (
  opts: {
    text?: string;
    displayCurrency?: string;
    recentEntries?: Array<{ amount: number; currency: string; category: string; date: string }>;
    currencyHint: string;
  }
) => {
  const today = new Date().toISOString().split('T')[0];
  const { text, displayCurrency, recentEntries, currencyHint } = opts;
  const recentContext = (recentEntries && recentEntries.length > 0)
    ? `Recent entries (most recent first): ${recentEntries
        .slice(0, 10)
        .map(e => `[${e.date}] ${e.category} ${e.amount} ${e.currency}`)
        .join('; ')}`
    : 'No recent entries available.';

  return `You are analyzing a ${text ? 'text' : 'file'} to extract financial entry information.
today is ${today}.
${currencyHint}
${recentContext}
If there is no exact sum or price depicted in the data, return the following object:
{type: "expense", amount: 0, currency: "USD", category: "Other", date: today, description: "Unknown", confidence: 0}
Extract the following information from the data:
- type: "expense" or "income"
- amount: the total amount (absolute number value)
- currency: the currency code (USD, EUR, etc.). If missing, follow this inference order: ${currencyHint}
- category: select the most relevant category from the list: ${CATEGORY_NAMES.join(', ')}
- date: the date of the transaction (YYYY-MM-DD). default to today if not provided
- description: brief description of WHAT IS the expense / income source, merchant, item, etc. feel free to add an emoji if it makes sense.
- confidence: your confidence in the extraction (0.0 to 1.0)
Example input: 50 ${displayCurrency || 'USD'} at mcdonalds
Example response expected from you for the given input (omit any text and decorators beside the raw JSON):
{type: "expense", amount: 50, currency: "${displayCurrency || 'USD'}", category: "Food", date: ${today}", description: "Lunch at McDonald's 🍔", confidence: 1.0}
Here's the data to analyze: ${text}`;
};

const extractJSON = (text: string): string => {
  const jsonBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonBlockMatch) {
    return jsonBlockMatch[1].trim();
  }
  
  return text.trim();
};

const fetchRecentEntries = async (userId: string, maxCount: number = 25) => {
  return getEntriesSummary({ userId, limit: maxCount });
};

export const processEntry = async (
  text?: string,
  file?: File,
  opts?: { userId?: string; displayCurrency?: string }
) => {
  if (!text && !file) throw new Error('No text or file provided');
  const model = getEntryParserModel();
  const filePart = file ? await fileToPart(file) : '';

  let recentEntries: Array<{ amount: number; currency: string; category: string; date: string }> | undefined;
  let lastThreeCurrencies: string[] | undefined;
  if (opts?.userId) {
    try {
      recentEntries = await fetchRecentEntries(opts.userId, 25);
      lastThreeCurrencies = Array.from(new Set((recentEntries || [])
        .map(e => (e.currency || '').toUpperCase())
        .filter(Boolean))).slice(0, 3);
    } catch {
      recentEntries = undefined; // proceed without context
    }
  }

  // Build final currency hint text once, with explicit order including last 3, display, and USD
  const currencyOrder = Array.from(new Set([...(lastThreeCurrencies || []), opts?.displayCurrency, 'USD'].filter(Boolean))) as string[];
  const currencyHint = `Currency inference order (highest priority first): ${currencyOrder.join(' -> ')}.`;

  const result = await model.generateContent([
    getAnalysisPrompt({ text, displayCurrency: opts?.displayCurrency, recentEntries: recentEntries, currencyHint }),
    filePart
  ]);
  const rawText = result.response.text();
  
  return extractJSON(rawText);
}


