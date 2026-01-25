
import { GoogleGenAI, Type } from "@google/genai";
import { Question, TargetSection, EikenGrade } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const GRADE_CONFIGS: Record<EikenGrade, any> = {
  'GRADE_5': {
    instructions: `
      - LEVEL: Eiken Grade 5 (CEFR A1, Elementary English).
      - VOCABULARY: Basic verbs (eat, go, see), nouns (family, school, dog, apple), adjectives (big, happy).
      - GRAMMAR: Present tense only. Pronouns, plurals, basic prepositions (at, in, on).
      - EXAM STRUCTURE: Total 25 questions.
        * PART 1 (Vocabulary/Grammar): 15 questions.
        * PART 2 (Dialogues): 5 questions.
        * PART 3 (Ordering): 5 questions.
      - PART 3 SPECIFICS: 
        * Exactly 4 words/phrases in 'context'. 
        * Identify 1st and 3rd words. 
        * Skeleton: '[ 1 ] ( ) [ 3 ] ( )' with punctuation at the end.`,
    totalQuestions: 25,
    structure: { PART_1: 15, PART_2: 5, PART_3: 5 }
  },
  'GRADE_4': {
    instructions: `
      - LEVEL: Eiken Grade 4 (CEFR A2, Junior High level).
      - VOCABULARY: Daily life, shopping, travel, basic hobbies.
      - GRAMMAR: Past tense, comparative, modal verbs (can, must, will), basic conjunctions.
      - EXAM STRUCTURE: Total 35 questions.
        * PART 1: 15 questions.
        * PART 2: 5 questions.
        * PART 3: 5 questions.
        * PART 4: 10 questions.
      - PART 4 SPECIFICS: Reading comprehension for posters, emails, and short stories.
      - PART 3 SPECIFICS: 
        * Exactly 5 words/phrases in 'context'.
        * Identify 2nd and 4th words.
        * Skeleton: '( ) [ 2 ] ( ) [ 4 ] ( )' with punctuation at the end.`,
    totalQuestions: 35,
    structure: { PART_1: 15, PART_2: 5, PART_3: 5, PART_4: 10 }
  },
  'GRADE_3': { instructions: "Eiken Grade 3 level...", totalQuestions: 30, structure: {} },
  'GRADE_PRE_2': { instructions: "Eiken Grade Pre-2 level...", totalQuestions: 37, structure: {} },
  'GRADE_2': { instructions: "Eiken Grade 2 level...", totalQuestions: 38, structure: {} },
  'GRADE_2_PLUS': { instructions: "Eiken Grade 2 Plus level...", totalQuestions: 38, structure: {} },
  'GRADE_PRE_1': { instructions: "Eiken Grade Pre-1 level...", totalQuestions: 41, structure: {} },
  'GRADE_1': { instructions: "Eiken Grade 1 level...", totalQuestions: 41, structure: {} },
};

const questionSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.INTEGER },
    type: { type: Type.STRING, description: "VOCABULARY, DIALOGUE, SENTENCE_ORDER, or READING_COMPREHENSION" },
    context: { type: Type.STRING, description: "Part 3: numbered words 1-5. Part 4: The full reading passage." },
    text: { type: Type.STRING, description: "Question text. Part 3 MUST be Japanese meaning. Dialogue use \\n." },
    skeleton: { type: Type.STRING, description: "Part 3 pattern like ( ) [ 2 ] ( ) [ 4 ] ( )." },
    options: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      minItems: 4,
      maxItems: 4,
      description: "Four choices."
    },
    correctAnswer: { type: Type.INTEGER, description: "0-3 index" },
    explanation: { type: Type.STRING, description: "Japanese explanation including the full English sentence." },
    category: { type: Type.STRING, description: "Brief category name." }
  },
  required: ["id", "type", "text", "options", "correctAnswer", "explanation", "category"]
};

const examSchema = {
  type: Type.ARRAY,
  items: questionSchema
};

export async function generateFullExam(grade: EikenGrade = 'GRADE_4'): Promise<Question[]> {
  const config = GRADE_CONFIGS[grade];
  const prompt = `
    Generate a complete Eiken ${grade.replace('_', ' ')} Reading Exam (${config.totalQuestions} questions) as a raw JSON array.
    
    ### RULES:
    ${config.instructions}
    - PART 3 (Sentence Order): 'text' MUST be Japanese. 'context' contains the numbered English words.
    - PART 4 (Reading): Include passage in 'context'.
    - DIALOGUES: Use \\n for speaker changes.
    - DO NOT TRUNCATE. Ensure the JSON array is complete and valid.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", // Upgraded to Pro for complex multi-question generation
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: examSchema as any,
        temperature: 0.4,
        maxOutputTokens: 16384, // Increased significantly to avoid truncation of 35-question test
      },
    });
    
    const text = response.text.trim();
    if (!text) throw new Error("AI returned empty response");
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Full Exam Generation Error:", error);
    throw error;
  }
}

export async function generateTargetPractice(grade: EikenGrade = 'GRADE_4', section: TargetSection): Promise<Question[]> {
  const config = GRADE_CONFIGS[grade];
  let sectionRules = "";
  let count = 10;

  switch(section) {
    case 'PART_1': count = 15; sectionRules = "Focus on Vocabulary/Grammar."; break;
    case 'PART_2': count = 5; sectionRules = "Dialogue completion."; break;
    case 'PART_3': count = 5; sectionRules = "Sentence ordering with Japanese hints."; break;
    case 'PART_4': count = 10; sectionRules = "Reading comprehension passages."; break;
  }

  const prompt = `Generate exactly ${count} Eiken ${grade.replace('_', ' ')} questions for ${section}. Rules: ${config.instructions} ${sectionRules}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: examSchema as any,
        maxOutputTokens: 8192,
      },
    });
    return JSON.parse(response.text.trim() || "[]");
  } catch (error) {
    console.error(`Target Practice Generation Error (${section}):`, error);
    throw error;
  }
}

export async function remakeQuestion(grade: EikenGrade, original: Question): Promise<Question> {
  const prompt = `Generate a NEW Eiken ${grade.replace('_', ' ')} question of type ${original.type}. Follow original difficulty.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: questionSchema as any,
      },
    });
    const newQ = JSON.parse(response.text.trim() || "{}");
    return { ...newQ, id: original.id, type: original.type };
  } catch (error) {
    console.error("Remake Question Error:", error);
    throw error;
  }
}
