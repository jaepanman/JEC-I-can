
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
        * Skeleton: '[ 1 ] ( ) [ 3 ] ( ) ?' or '[ 1 ] ( ) [ 3 ] ( ) .'`,
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
      - PART 3 SPECIFICS: 
        * Exactly 5 words/phrases in 'context'.
        * Identify 2nd and 4th words.
        * Skeleton: '( ) [ 2 ] ( ) [ 4 ] ( ) .' or '( ) [ 2 ] ( ) [ 4 ] ( ) ?'`,
    totalQuestions: 35,
    structure: { PART_1: 15, PART_2: 5, PART_3: 5, PART_4: 10 }
  },
  // Placeholders for future grades
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
    context: { type: Type.STRING, description: "For SENTENCE_ORDER: numbered words/phrases (1-4 for G5, 1-5 for G4). MUST NOT contain any punctuation. For READING: The passage text." },
    text: { type: Type.STRING, description: "The question text. FOR SENTENCE_ORDER: This MUST ALWAYS be in Japanese. FOR DIALOGUE: Use '\\n' to separate speakers." },
    skeleton: { type: Type.STRING, description: "For SENTENCE_ORDER: Use structure '[ 1 ] ( ) [ 3 ] ( )' for G5 or '( ) [ 2 ] ( ) [ 4 ] ( )' for G4. Punctuation MUST be at the end." },
    options: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      minItems: 4,
      maxItems: 4,
      description: "Pairs in 'Choice#-Choice#' format for the marked positions."
    },
    correctAnswer: { type: Type.INTEGER, description: "Index of correct option (0-3)" },
    explanation: { type: Type.STRING, description: "Japanese explanation. MUST state the full correct English sentence." },
    category: { type: Type.STRING, description: "Eiken category." }
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
    Generate a complete Eiken ${grade.replace('_', ' ')} Reading Exam (${config.totalQuestions} questions) in JSON format.
    
    ### GRADE SPECIFIC RULES:
    ${config.instructions}

    ### GENERAL RULES:
    1. TARGET: Japanese sentence in 'text' field for Part 3.
    2. CHOICES (context): english fragments numbered 1-X. NO punctuation.
    3. CAPITALIZATION: Lowercase the starting word in 'context' unless it is a proper noun (Tom, Japan), an abbreviation (TV, CD), or the pronoun "I". "I" MUST ALWAYS be capitalized.
    4. DIALOGUE FORMATTING: Part 2: Always use '\\n' between speakers in 'text'.

    Return exactly ${config.totalQuestions} unique questions.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: examSchema as any,
      },
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Error generating exam:", error);
    throw error;
  }
}

export async function generateTargetPractice(grade: EikenGrade = 'GRADE_4', section: TargetSection): Promise<Question[]> {
  const config = GRADE_CONFIGS[grade];
  let sectionRules = "";
  let count = 10;

  switch(section) {
    case 'PART_1':
      count = 15;
      sectionRules = "Focus on Vocabulary, Grammar, and Fill-in-the-blanks.";
      break;
    case 'PART_2':
      count = 5;
      sectionRules = "Dialogue completion. Use '\\n' to separate speakers in 'text'.";
      break;
    case 'PART_3':
      count = 5;
      sectionRules = "Sentence ordering with Japanese hints.";
      break;
    case 'PART_4':
      count = grade === 'GRADE_5' ? 0 : 10;
      sectionRules = "Reading comprehension: posters, emails, stories.";
      break;
  }

  const prompt = `
    Generate exactly ${count} Eiken ${grade.replace('_', ' ')} questions for Section ${section}.
    
    ### GRADE SPECIFIC RULES:
    ${config.instructions}
    
    ${sectionRules}
    
    Return as a JSON array of questions.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: examSchema as any,
      },
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error(`Error generating target practice for ${section}:`, error);
    throw error;
  }
}

export async function remakeQuestion(grade: EikenGrade, original: Question): Promise<Question> {
  const config = GRADE_CONFIGS[grade];
  const prompt = `
    Generate a NEW Eiken ${grade.replace('_', ' ')} question of the same type: ${original.type}.
    
    ### GRADE SPECIFIC RULES:
    ${config.instructions}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: questionSchema as any,
      },
    });
    const newQ = JSON.parse(response.text || "{}");
    return { ...newQ, id: original.id, type: original.type };
  } catch (error) {
    console.error("Error remaking question:", error);
    throw error;
  }
}

export async function generateReviewExam(grade: EikenGrade, missedCategories: string[]): Promise<Question[]> {
  const config = GRADE_CONFIGS[grade];
  const categoriesStr = missedCategories.join(", ");
  const prompt = `
    Generate 10 Eiken ${grade.replace('_', ' ')} review questions for: ${categoriesStr}. 
    
    ### GRADE SPECIFIC RULES:
    ${config.instructions}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: examSchema as any,
      },
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    throw error;
  }
}
