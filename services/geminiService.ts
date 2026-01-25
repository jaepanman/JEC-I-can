
import { GoogleGenAI, Type } from "@google/genai";
import { Question, TargetSection, EikenGrade, QuestionType } from "../types";

const GRADE_CONFIGS: Record<EikenGrade, any> = {
  'GRADE_5': {
    instructions: `
      - LEVEL: Eiken Grade 5 (Elementary).
      - STRUCTURE: 25 questions total.
      - DIALOGUE (Part 2): Short conversation (2-3 turns). Format turns like:
        Speaker A: [text]
        Speaker B: (      )
        Use '\\n' for new lines between speakers. One turn MUST be a blank '(      )'.
      - SENTENCE_ORDER (Part 3): 
        * Context: Exactly 4 numbered English words (e.g., "1. go 2. to 3. I 4. school").
        * Text: The Japanese translation.
        * Skeleton: MUST be exactly "[ 1 ] ( ) [ 3 ] ( )". 
        * Options: Combinations of the word numbers (e.g., "3-1").`,
    totalQuestions: 25,
  },
  'GRADE_4': {
    instructions: `
      - LEVEL: Eiken Grade 4 (Junior High level).
      - STRUCTURE: 35 questions total.
      - DIALOGUE (Part 2): Short conversation (2-4 turns). Format turns like:
        Speaker A: [text]
        Speaker B: [text]
        Speaker A: (      )
        Use '\\n' for new lines between speakers. One turn MUST be a blank '(      )'.
      - SENTENCE_ORDER (Part 3): 
        * Context: Exactly 5 numbered English words (e.g., "1. my 2. is 3. friend 4. This 5. best").
        * Text: The Japanese translation.
        * Skeleton: MUST be exactly "( ) [ 2 ] ( ) [ 4 ] ( )".
        * Options: Combinations of the word numbers (e.g., "4-2").`,
    totalQuestions: 35,
  },
  'GRADE_3': { instructions: "Eiken Grade 3 level.", totalQuestions: 30 },
  'GRADE_PRE_2': { instructions: "Eiken Grade Pre-2 level.", totalQuestions: 37 },
  'GRADE_2': { instructions: "Eiken Grade 2 level.", totalQuestions: 38 },
  'GRADE_2_PLUS': { instructions: "Eiken Grade 2 Plus level.", totalQuestions: 38 },
  'GRADE_PRE_1': { instructions: "Eiken Grade Pre-1 level.", totalQuestions: 41 },
  'GRADE_1': { instructions: "Eiken Grade 1 level.", totalQuestions: 41 },
};

const questionSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.INTEGER },
    type: { 
      type: Type.STRING, 
      enum: Object.values(QuestionType),
      description: "One of: VOCABULARY, DIALOGUE, SENTENCE_ORDER, READING_COMPREHENSION"
    },
    context: { type: Type.STRING, description: "Passage or numbered words list. For DIALOGUE, leave null." },
    text: { type: Type.STRING, description: "Question text. For DIALOGUE, include '\\n' and '(      )'. For ORDERING, Japanese translation." },
    skeleton: { type: Type.STRING, description: "REQUIRED for SENTENCE_ORDER. Grade 5: '[ 1 ] ( ) [ 3 ] ( )'. Grade 4: '( ) [ 2 ] ( ) [ 4 ] ( )'." },
    options: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      minItems: 4,
      maxItems: 4,
      description: "Four choices. For ORDERING, use combinations like '1-3'."
    },
    correctAnswer: { type: Type.INTEGER, description: "0-3 index" },
    explanation: { type: Type.STRING, description: "Japanese explanation." },
    category: { type: Type.STRING }
  },
  required: ["id", "type", "text", "options", "correctAnswer", "explanation", "category"]
};

const examSchema = {
  type: Type.ARRAY,
  items: questionSchema
};

export async function generateFullExam(grade: EikenGrade = 'GRADE_4'): Promise<Question[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const config = GRADE_CONFIGS[grade];
  
  const prompt = `
    Generate a complete Eiken ${grade.replace('_', ' ')} Reading Exam (${config.totalQuestions} questions) as a raw JSON array.
    
    ### FORMATTING RULES:
    ${config.instructions}
    - DIALOGUES: Start each speaker on a new line. Include a blank '(      )'.
    - SENTENCE_ORDER: 
        * MUST include the 'skeleton' string.
        * 'text' MUST be the Japanese meaning.
        * 'options' are number pairs (e.g., '1-3').
    - DO NOT TRUNCATE. Valid JSON only.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: examSchema as any,
        temperature: 0.2, // Lower temperature for maximum precision
        maxOutputTokens: 15000, 
        thinkingConfig: { thinkingBudget: 0 } 
      },
    });
    
    const text = response.text.trim();
    if (!text) throw new Error("Empty response from Gemini");
    
    const parsed = JSON.parse(text);
    return parsed;
  } catch (error: any) {
    console.error("GEMINI_SERVICE_ERROR:", error);
    throw new Error(error?.message || "Failed to communicate with Gemini API");
  }
}

export async function generateTargetPractice(grade: EikenGrade = 'GRADE_4', section: TargetSection): Promise<Question[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const config = GRADE_CONFIGS[grade];
  let count = section === 'PART_1' ? 15 : section === 'PART_4' ? 10 : 5;

  const prompt = `Generate exactly ${count} Eiken ${grade.replace('_', ' ')} questions for ${section}. 
  Rules: ${config.instructions}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: examSchema as any,
        maxOutputTokens: 8000,
        thinkingConfig: { thinkingBudget: 0 }
      },
    });
    return JSON.parse(response.text.trim() || "[]");
  } catch (error: any) {
    console.error(`TARGET_PRACTICE_ERROR (${section}):`, error);
    throw new Error(error?.message || "Practice generation failed");
  }
}

export async function remakeQuestion(grade: EikenGrade, original: Question): Promise<Question> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const config = GRADE_CONFIGS[grade];
  const prompt = `Generate a NEW Eiken ${grade.replace('_', ' ')} question of type ${original.type}. 
  Rules: ${config.instructions}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: questionSchema as any,
        thinkingConfig: { thinkingBudget: 0 }
      },
    });
    const newQ = JSON.parse(response.text.trim() || "{}");
    return { ...newQ, id: original.id, type: original.type };
  } catch (error: any) {
    console.error("REMAKE_QUESTION_ERROR:", error);
    throw new Error(error?.message || "Remake failed");
  }
}
