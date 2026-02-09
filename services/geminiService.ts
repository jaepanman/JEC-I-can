
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Question, TargetSection, EikenGrade, QuestionType } from "../types";

const GRADE_4_PART_1_PROMPT = `Section 1: Vocabulary and Grammar (Questions 1–15)
Instructions: Create 15 multiple-choice questions (fill-in-the-blank). All blanks MUST be "(___)".
Format Mix:
50% (approx. 7–8 questions): Short A-B Conversations. 
CRITICAL: Use the format "A: [Sentence]\nB: [Sentence]". Use a literal newline (\n) between Speaker A and Speaker B.
50% (approx. 7–8 questions): Single narrative sentences.
Length Constraint: Keep the total word count (Question Text + 4 Options) between 20 and 25 words per item.
The main question text should be 15–20 words.
Options must be short (mostly 1 word).
Sentence Structure Targets: Use compound and complex sentences (so, but, because, when, if).
Content Focus: Weather, family, jobs, irregular verbs, prepositions, and comparatives.`;

const GRADE_4_PART_2_PROMPT = `Section 2: Conversations (Questions 16–20)
Instructions: Create dialogue items. 
CRITICAL: Use the format "A: [Sentence]\nB: [Sentence]". If 3 lines, use "A: ...\nB: ...\nA: ...".
Use a literal newline (\n) between speakers.
DO NOT USE HTML TAGS.
Choices must be complete sentences or standard phrases. All blanks MUST be exactly "(___)".`;

const GRADE_4_PART_3_PROMPT = `Section 3: Sentence Rearranging (Questions 21–25)
Instructions: Provide a Japanese meaning for 'text', EXACTLY 5 scrambled fragments (as 'context'), and a 5-slot skeleton.
CRITICAL RULE: Grade 4 Part 3 ALWAYS asks for the combination of the 2nd and 4th words.
1. 'skeleton' MUST contain exactly 5 blanks/boxes: "(___) [ 2 ] (___) [ 4 ] (___)".
2. 'options' MUST be 4 strings of hyphenated pairs (IDs 1-5), e.g., "3-5".
3. 'correctAnswer' MUST be the 0-based index.`;

const GRADE_5_PART_3_PROMPT = `Section 3: Sentence Rearranging (Questions 21–25)
Instructions: Provide a Japanese meaning for 'text', EXACTLY 4 scrambled fragments (as 'context'), and a 4-slot skeleton.
CRITICAL RULE: Grade 5 Part 3 ALWAYS asks for the combination of the 1st and 3rd words.
1. 'skeleton' MUST contain exactly 4 blanks/boxes: "[ 1 ] (___) [ 3 ] (___)". 
2. 'options' MUST be 4 strings of hyphenated pairs (IDs 1-4), e.g., "1-3".`;

const GRADE_4_PART_4_PROMPT = `Section 4: Reading Comprehension (Questions 26–35)
General Rules: Use [TITLE] for all passages. Use \n for line breaks.

Part 4A (Q26-27 - Notices/Flyers):
- Format: [POSTER] Title\nDetails...
- Content: Event or notice with clear Time:, Place:, and Date: markers.

Part 4B (Q28–30 - Email Exchange): 
- Format: [EMAIL]
- Must include headers: From:, To:, Subject:.
- CRITICAL RULE: Must include 2 emails. The first email should be 60-80 words. The response should be 50-70 words. Use "--- Response Email ---" as a separator.

Part 4C (Q31–35 - Narrative):
- Format: 3 paragraph story. Paragraph 1: The Motivation. Paragraph 2: The Process. Paragraph 3: The Result & Reflection.
- Title: REQUIRED
- Length: Approx 180 words.`;

const SECTION_DEFS: Record<TargetSection, string> = {
  PART_1: GRADE_4_PART_1_PROMPT,
  PART_2: GRADE_4_PART_2_PROMPT,
  PART_3: "DYNAMIC_PROMPT", 
  PART_4: GRADE_4_PART_4_PROMPT
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
    context: { type: Type.STRING, description: "Passage or fragments list. For Part 1/2, optional short context like 'At a restaurant'." },
    text: { type: Type.STRING, description: "The actual question or dialogue. Use \n for line breaks between speakers." },
    skeleton: { type: Type.STRING, description: "Sentence with boxes like [ 2 ]. Part 3 only." },
    options: { type: Type.ARRAY, items: { type: Type.STRING } },
    correctAnswer: { type: Type.INTEGER },
    explanation: { 
      type: Type.STRING, 
      description: "Detailed Japanese explanation. MUST include: 1) '【日本語訳】' followed by a full translation. 2) '【解説】' explaining the choice." 
    },
    category: { type: Type.STRING }
  },
  required: ["type", "text", "options", "correctAnswer", "explanation"]
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

async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let delay = 2000;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if ((error.message?.includes("503") || error.message?.includes("429") || error.message?.includes("overloaded")) && i < maxRetries - 1) {
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const count = (grade === 'GRADE_4' && section === 'PART_4') ? 10 : (section === 'PART_1' ? 15 : 5);
  let sectionPrompt = SECTION_DEFS[section];
  if (section === 'PART_3') {
    sectionPrompt = grade === 'GRADE_5' ? GRADE_5_PART_3_PROMPT : GRADE_4_PART_3_PROMPT;
  }
  
  const targetType = TYPE_MAPPINGS[section];
  const themeInjection = theme ? `THEME: "${theme}".` : `VARIETY: Authentic Eiken themes.`;

  const prompt = `Generate exactly ${count} Eiken ${grade.replace('_', ' ')} questions for ${section}. ${sectionPrompt} ${themeInjection} 
  CRITICAL: The 'explanation' field MUST be in Japanese and contain TWO parts: 
  1) '【日本語訳】': A complete translation of the question/passage. 
  2) '【解説】': A logical explanation of the correct choice.
  Return JSON array. NO HTML.`;

  try {
    const response: GenerateContentResponse = await retryWithBackoff(() => ai.models.generateContent({
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
    throw error;
  }
}

export async function remakeQuestion(grade: EikenGrade, original: Question): Promise<Question> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const section = original.category as TargetSection;
  const targetType = TYPE_MAPPINGS[section] || original.type;

  let sectionPrompt = SECTION_DEFS[section] || SECTION_DEFS['PART_1'];
  if (section === 'PART_3') {
    sectionPrompt = grade === 'GRADE_5' ? GRADE_5_PART_3_PROMPT : GRADE_4_PART_3_PROMPT;
  }
  
  const prompt = `Generate ONE new Eiken ${grade.replace('_', ' ')} question for ${section}. ${sectionPrompt} 
  Include '【日本語訳】' and '【解説】' in the explanation field. Return as JSON object.`;

  try {
    const response: GenerateContentResponse = await retryWithBackoff(() => ai.models.generateContent({
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
