
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
CRITICAL: Speaker A and Speaker B must ALWAYS be separated by a line break (\n). 
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
Format passages like professional flyers, emails, or stories using clear headers and \\n for layout.
Flyer: [TITLE], dashed dividers, bullet points.
Email: From/To/Subject headers, formal greeting.
Story: [TITLE], paragraphs.`;

const SECTION_DEFS: Record<TargetSection, string> = {
  PART_1: `Section 1. Vocabulary and Grammar. Short conversations or single sentences. Focus on daily life. All blanks MUST be "(___)".`,
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
    skeleton: { type: Type.STRING, description: "Sentence with boxes like [ 2 ]." },
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
    const trimmed = text.trim();
    const start = trimmed.indexOf('[');
    const end = trimmed.lastIndexOf(']');
    if (start !== -1 && end !== -1) return JSON.parse(trimmed.substring(start, end + 1));
    
    const objStart = trimmed.indexOf('{');
    const objEnd = trimmed.lastIndexOf('}');
    if (objStart !== -1 && objEnd !== -1) return JSON.parse(trimmed.substring(objStart, objEnd + 1));
    
    return JSON.parse(trimmed);
  } catch (e) {
    console.error("JSON Error. Raw text:", text);
    throw new Error("Invalid response format.");
  }
}

export async function* streamQuestions(grade: EikenGrade, section: TargetSection, theme?: string): AsyncGenerator<Question> {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey.length < 5) {
    console.error("API_KEY is missing in process.env. Current process.env:", process.env);
    throw new Error("Missing Gemini API Key. Please set VITE_API_KEY.");
  }

  const config = GRADE_CONFIGS[grade] || GRADE_CONFIGS['GRADE_4']!;
  const count = config.counts[section] || 5;
  
  let sectionPrompt = SECTION_DEFS[section];
  if (section === 'PART_3') {
    sectionPrompt = grade === 'GRADE_5' ? GRADE_5_PART_3_PROMPT : GRADE_4_PART_3_PROMPT;
  }
  
  const targetType = TYPE_MAPPINGS[section];
  const themeInjection = theme 
    ? `THEME: "${theme}".` 
    : `VARIETY: Use themes like ${AUTHENTIC_THEMES.slice(0, 3).join(', ')}.`;

  const prompt = `Generate exactly ${count} Eiken ${grade.replace('_', ' ')} questions for ${section}.
    ${sectionPrompt}
    ${themeInjection}
    Return ONLY JSON array. 'type' MUST be "${targetType}". All 'explanation' in Japanese.`;

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: questionSchema } as any,
        temperature: 0.8,
      },
    });

    const questions: any[] = extractJson(response.text);
    for (const q of questions) {
      yield { ...q, id: Math.random(), category: section, type: targetType };
    }
  } catch (error: any) {
    console.error("GEMINI_STREAM_ERROR:", error);
    throw error;
  }
}

export async function remakeQuestion(grade: EikenGrade, original: Question): Promise<Question> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("Missing API Key.");

  const ai = new GoogleGenAI({ apiKey });
  const section = original.category as TargetSection;
  const targetType = TYPE_MAPPINGS[section] || original.type;

  let sectionPrompt = SECTION_DEFS[section] || SECTION_DEFS['PART_1'];
  if (section === 'PART_3') {
    sectionPrompt = grade === 'GRADE_5' ? GRADE_5_PART_3_PROMPT : GRADE_4_PART_3_PROMPT;
  }
  
  const prompt = `Generate ONE new Eiken ${grade.replace('_', ' ')} question for ${section}. 
  ${sectionPrompt} Return as JSON object. 'type' MUST be ${targetType}.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: questionSchema as any,
      temperature: 1.0,
    },
  });

  const newQ = extractJson(response.text);
  return { ...newQ, id: original.id, category: original.category, type: targetType };
}
