
import { GoogleGenAI, Type } from "@google/genai";
import { Question, TargetSection, EikenGrade, QuestionType } from "../types";

const EIKEN_4_GRAMMAR_FORMULA = `
STRICTLY cycle through these specific syntactic structures:
1. Verb + To-Infinitive: want to / like to / started to / need to
2. Verb + Gerund: enjoy ~ing / finished ~ing / stopped ~ing
3. Time/Reason Clauses: When I was... / because it was...
4. Comparisons: as [adj] as / [adj]-er than / the most [adj]
5. Conjunctions/Prepositions: before going to bed / after school / by bus
6. Question Forms: What time... / How many... / Where did you...
7. Common Phrasal Verbs: look for / look at / get up / listen to
`;

const GRADE_4_PART_2_PROMPT = `
Section 2: Conversations (Questions 16–20)
Scenario Logic: Use "Adjacency Pairs."
- Item 1: Wh- question regarding frequency (How often/How many).
- Item 2: Social reaction to bad news/problem (I'm sorry to hear that / That's too bad).
- Item 3: Suggestion and counter-offer (Why don't we... / How about...?).
- Item 4: Asking for permission or help (May I... / Can you...?).
- Item 5: Clarification of location or time (Which bus... / What time...).
FORMAT: Speaker A and Speaker B must ALWAYS be separated by a literal newline character (\\n). 
Example: "A: Can you help me?\\nB: Sure, what's the problem?"
All blanks MUST be exactly "(___)".
`;

const GRADE_4_PART_3_PROMPT = `
Section 3: Sentence Rearranging (Questions 21–25)
Target Q21: To-infinitive (e.g., decided to study).
Target Q22: Time Clause (e.g., When I went to...).
Target Q23: Phrasal Verb (e.g., looking for my...).
Target Q24: Comparison (e.g., more interesting than...).
Target Q25: Gerund (e.g., finished cleaning the...).
Skeleton MUST be: "(___) [ 2 ] (___) [ 4 ] (___)".
Options MUST be hyphenated pairs of IDs (e.g., "3-5").
Provide a Japanese meaning.
`;

const GRADE_4_PART_4_PROMPT = `
Section 4: Reading Comprehension (Q26–35)
STRICT DIVERSITY RULE: Avoid generic scenarios. Rotate themes: environment, technology, local history, unusual hobbies, volunteering, and diverse cultural exchanges.

Part 4A (Q26-27 - Notice/Flyer): 
- Create a Volunteer Flyer or Special Club Announcement (e.g., "Stargazing Club" or "Beach Clean-up"). Include specific "Rules" or "Requirements".
- Format: Use [TITLE] for header. Use Date:, Time:, Place:, Price: labels. Use --- for horizontal lines.

Part 4B (Q28–30 - Email): 
- A 3-paragraph email exchange between a student and host family/pen-pal about a specific local problem or success (e.g., "I finally learned how to make sushi" or "Our school garden grew 50 tomatoes").
- Headers: From:, To:, Subject:.

Part 4C (Q31–35 - Narrative): 
- 180-word story. Theme: "A Small Achievement". Character tries something new (e.g., birdwatching, baking, volunteering).
- Para 1: Motivation (Why start). Para 2: Process (Past tense). Para 3: Result & Reflection.

Formatting: Always use \\n for line breaks. Questions sharing the same passage MUST have the EXACT SAME 'context' string.
`;

const SECTION_DEFS: Record<TargetSection, string> = {
  PART_1: `Section 1. Vocab & Grammar. ${EIKEN_4_GRAMMAR_FORMULA} Variety: City, School, Nature, Health, Tech. Blanks: (___).`,
  PART_2: GRADE_4_PART_2_PROMPT,
  PART_3: GRADE_4_PART_3_PROMPT,
  PART_4: GRADE_4_PART_4_PROMPT
};

const questionSchema = {
  type: Type.OBJECT,
  properties: {
    type: { type: Type.STRING },
    context: { type: Type.STRING, description: "Passage, Flyer, or fragments. Use \\n for breaks." },
    text: { type: Type.STRING, description: "Question text or Speaker Dialogue. Blanks: (___). Use \\n for speaker breaks." },
    skeleton: { type: Type.STRING },
    options: { type: Type.ARRAY, items: { type: Type.STRING } },
    correctAnswer: { type: Type.INTEGER },
    explanation: { type: Type.STRING },
    category: { type: Type.STRING }
  },
  required: ["type", "text", "options", "correctAnswer", "explanation"]
};

function extractJson(text: string | undefined): any {
  if (!text) throw new Error("Empty AI response.");
  try {
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```[a-z]*\n/i, '').replace(/\n```$/i, '');
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start !== -1 && end !== -1) return JSON.parse(cleaned.substring(start, end + 1));
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error("Invalid JSON format from AI.");
  }
}

export async function* streamQuestions(grade: EikenGrade, section: TargetSection, theme?: string): AsyncGenerator<Question> {
  const apiKey = process.env.API_KEY || "";
  const ai = new GoogleGenAI({ apiKey });
  
  const sectionPrompt = SECTION_DEFS[section];
  const count = (grade === 'GRADE_4' && section === 'PART_4') ? 10 : 5;
  const themeInjection = theme ? `THEME FOCUS: "${theme}".` : `VARIETY: Rotate between diverse authentic Eiken themes.`;

  const prompt = `Role: Senior test designer for Eiken ${grade.replace('_', ' ')}. Task: Generate ${count} questions for ${section}. 
  ${sectionPrompt}
  ${themeInjection}
  Return a JSON array. All 'explanation' in Japanese. NO HTML. Use \\n for formatting.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: questionSchema } as any,
        temperature: 0.85,
      },
    });

    if (!response.text) {
       throw new Error("No text content returned from Gemini.");
    }

    const questions: any[] = extractJson(response.text);
    const typeMapping = {
      PART_1: QuestionType.VOCABULARY,
      PART_2: QuestionType.DIALOGUE,
      PART_3: QuestionType.SENTENCE_ORDER,
      PART_4: QuestionType.READING_COMPREHENSION
    };

    for (const q of questions) {
      yield { ...q, id: Math.random(), category: section, type: typeMapping[section] };
    }
  } catch (error: any) {
    console.error("Gemini Error:", error);
    // Return a structured error string that includes the reason code
    let message = error?.message || "Unknown API Error";
    if (typeof error === 'object' && error !== null) {
      try {
        message = JSON.stringify(error);
      } catch (e) {}
    }
    throw new Error(message);
  }
}

export async function remakeQuestion(grade: EikenGrade, original: Question): Promise<Question> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  const section = original.category as TargetSection;
  const prompt = `Generate ONE new Eiken ${grade} ${section} question. ${SECTION_DEFS[section] || ''} Return JSON.`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: questionSchema as any,
    },
  });
  const newQ = extractJson(response.text);
  return { ...newQ, id: original.id, category: original.category, type: original.type };
}
