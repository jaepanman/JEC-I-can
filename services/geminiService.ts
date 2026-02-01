
import { GoogleGenAI, Type } from "@google/genai";
import { Question, TargetSection, EikenGrade, QuestionType } from "../types";

const AUTHENTIC_THEMES = [
  "Weather and seasons", "Feelings and physical conditions", "Hobbies and club activities",
  "School life and classroom scenes", "Daily life and routines", "Family and friends",
  "Travel and transportation", "Shopping and department stores", "Nature and animals",
  "Food and cooking", "Health and visiting the doctor", "Technology and the internet",
  "Sports and exercise", "City life and directions", "Occupations and future dreams",
  "Special events and holidays"
];

const GRADE_4_PART_2_PROMPT = `Section 2: Conversations (Questions 16–20)
Instructions: Create dialogue items. Use A-B format (2 lines) or A-B-A format (3 lines).
CRITICAL: Speaker A and Speaker B must ALWAYS be separated by a literal newline character (\\n). 
DO NOT USE HTML TAGS.
Choices must be complete sentences or standard phrases. All blanks MUST be exactly "(___)".`;

const GRADE_4_PART_3_PROMPT = `Section 3: Sentence Rearranging (Questions 21–25)
Instructions: Provide a Japanese meaning, EXACTLY 5 scrambled fragments (as 'context'), and a 5-slot skeleton.
CRITICAL RULE: Grade 4 Part 3 ALWAYS asks for the combination of the 2nd and 4th words.
1. 'skeleton' MUST contain exactly 5 blanks/boxes: "(___) [ 2 ] (___) [ 4 ] (___)".
2. 'options' MUST be 4 strings of hyphenated pairs (IDs 1-5), e.g., "3-5".
3. 'correctAnswer' MUST be the 0-based index.`;

const GRADE_5_PART_3_PROMPT = `Section 3: Sentence Rearranging (Questions 21–25)
Instructions: Provide a Japanese meaning, EXACTLY 4 scrambled fragments (as 'context'), and a 4-slot skeleton.
CRITICAL RULE: Grade 5 Part 3 ALWAYS asks for the combination of the 1st and 3rd words.
1. 'skeleton' MUST contain exactly 4 blanks/boxes: "[ 1 ] (___) [ 3 ] (___)". 
2. 'options' MUST be 4 strings of hyphenated pairs (IDs 1-4), e.g., "1-3".`;

const GRADE_4_PART_4_PROMPT = `Section 4: Reading Comprehension (Questions 26–35)
General Rules: Use [TITLE] for all passages. Use \\n for line breaks.

Part 4B (Q28–30 - Email Exchange): 
- Format: A 3-paragraph email with headers (From:/To:/Subject:). 
- Theme: A student's personal message to a host family or friend about a specific event, achievement, or interesting local detail (e.g. learning a skill, a successful project, a trip).
- Content: MUST answer specific questions (e.g. "You asked about my...", "To answer your question...") to simulate a real reply. Avoid generic fillers.

Part 4C (Q31–35 - Narrative):
- Title: "A Small Achievement" (REQUIRED TITLE).
- Length: Approx 180 words.
- Paragraph 1 (Motivation): Introduce a character and why they decided to start a new activity or project.
- Paragraph 2 (Process): Describe the specific actions taken and hurdles overcome using past tense.
- Paragraph 3 (Result): Describe the outcome and what the character felt or learned.
- Be creative with varied character names and scenarios.`;

const SECTION_DEFS: Record<TargetSection, string> = {
  PART_1: `Section 1. Vocabulary and Grammar. Short conversations or single sentences. Focus on daily life. All blanks MUST be "(___)". DO NOT USE HTML.`,
  PART_2: GRADE_4_PART_2_PROMPT,
  PART_3: "DYNAMIC_PROMPT", 
  PART_4: GRADE_4_PART_4_PROMPT
};

const GRADE_CONFIGS: Partial<Record<EikenGrade, any>> = {
  'GRADE_5': { counts: { PART_1: 15, PART_2: 5, PART_3: 5 } },
  'GRADE_4': { counts: { PART_1: 15, PART_2: 5, PART_3: 5, PART_4: 10 } }
};

const TYPE_MAPPINGS: Record<TargetSection, QuestionType> = {
  PART_1: QuestionType.VOCABULARY,
  PART_2: QuestionType.DIALOGUE,
  PART_3: QuestionType.SENTENCE_ORDER,
  PART_4: QuestionType.READING_COMPREHENSION
};

const questionSchema = {
  type: Type.OBJECT,
  properties: {
    type: { type: Type.STRING },
    context: { type: Type.STRING, description: "Passage or fragments list." },
    text: { type: Type.STRING, description: "Question text or meaning. Blanks: (___)." },
    skeleton: { type: Type.STRING, description: "Sentence with boxes like [ 2 ]. Only for Part 3." },
    options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "4 choices." },
    correctAnswer: { type: Type.INTEGER, description: "0-based index." },
    explanation: { type: Type.STRING, description: "Japanese explanation." },
    category: { type: Type.STRING }
  },
  required: ["type", "text", "options", "correctAnswer", "explanation"],
  propertyOrdering: ["type", "context", "text", "skeleton", "options", "correctAnswer", "explanation", "category"]
};

function extractJson(text: string | undefined): any {
  if (!text) throw new Error("AI returned empty response.");
  try {
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```[a-z]*\n/i, '').replace(/\n```$/i, '');
    }
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start !== -1 && end !== -1) return JSON.parse(cleaned.substring(start, end + 1));
    const objStart = cleaned.indexOf('{');
    const objEnd = cleaned.lastIndexOf('}');
    if (objStart !== -1 && objEnd !== -1) return JSON.parse(cleaned.substring(objStart, objEnd + 1));
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error("AI output was not in valid JSON format. Try again.");
  }
}

function getValidApiKey(): string {
  const key = (window as any).process?.env?.API_KEY || (globalThis as any).process?.env?.API_KEY || (import.meta as any).env?.VITE_API_KEY || "";
  const cleanedKey = String(key).trim();
  
  if (cleanedKey.length > 0) {
    console.log(`[Gemini Auth] Key found (Length: ${cleanedKey.length}). Starts with: ${cleanedKey.substring(0, 4)}...`);
  } else {
    console.warn("[Gemini Auth] API Key is empty! Please check VITE_API_KEY.");
  }

  if (!cleanedKey || cleanedKey === "undefined" || cleanedKey === "null" || cleanedKey.length < 10) {
    throw new Error("Missing API Key. Ensure VITE_API_KEY is set.");
  }
  return cleanedKey;
}

async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let delay = 2000;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const isOverloaded = error.message?.includes("503") || error.message?.includes("overloaded");
      const isRateLimited = error.message?.includes("429");
      
      if ((isOverloaded || isRateLimited) && i < maxRetries - 1) {
        console.warn(`[Gemini] Model busy. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; 
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}

export async function* streamQuestions(grade: EikenGrade, section: TargetSection, theme?: string): AsyncGenerator<Question> {
  const apiKey = getValidApiKey();
  const config = GRADE_CONFIGS[grade] || GRADE_CONFIGS['GRADE_4']!;
  const count = config.counts[section] || 5;
  
  let sectionPrompt = SECTION_DEFS[section];
  if (section === 'PART_3') {
    sectionPrompt = grade === 'GRADE_5' ? GRADE_5_PART_3_PROMPT : GRADE_4_PART_3_PROMPT;
  }
  
  const targetType = TYPE_MAPPINGS[section];
  const themeInjection = theme ? `THEME: "${theme}".` : `VARIETY: Authentic Eiken themes.`;

  const prompt = `Generate exactly ${count} Eiken ${grade.replace('_', ' ')} questions for ${section}. ${sectionPrompt} ${themeInjection} Return JSON array. All 'explanation' in Japanese. NO HTML.`;

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await retryWithBackoff(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: questionSchema } as any,
        temperature: 0.8,
      },
    }));

    const questions: any[] = extractJson(response.text);
    for (const q of questions) {
      yield { ...q, id: Math.random(), category: section, type: targetType };
    }
  } catch (error: any) {
    console.error("GEMINI_API_ERROR:", error);
    if (error.message?.includes("400") || error.message?.includes("API key not valid")) {
      throw new Error("Google API Key Error: Please go to Google Cloud Console and enable the 'Generative Language API'.");
    }
    if (error.message?.includes("503") || error.message?.includes("overloaded")) {
      throw new Error("AI is currently busy / AIが混み合っています。少し時間をおいてからもう一度お試しください。");
    }
    throw error;
  }
}

export async function remakeQuestion(grade: EikenGrade, original: Question): Promise<Question> {
  const apiKey = getValidApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const section = original.category as TargetSection;
  const targetType = TYPE_MAPPINGS[section] || original.type;

  let sectionPrompt = SECTION_DEFS[section] || SECTION_DEFS['PART_1'];
  if (section === 'PART_3') {
    sectionPrompt = grade === 'GRADE_5' ? GRADE_5_PART_3_PROMPT : GRADE_4_PART_3_PROMPT;
  }
  
  const prompt = `Generate ONE new Eiken ${grade.replace('_', ' ')} question for ${section}. ${sectionPrompt} Return as JSON object. NO HTML.`;

  try {
    const response = await retryWithBackoff(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: questionSchema as any,
        temperature: 1.0,
      },
    }));
    const newQ = extractJson(response.text);
    return { ...newQ, id: original.id, category: original.category, type: targetType };
  } catch (error: any) {
    throw error;
  }
}
