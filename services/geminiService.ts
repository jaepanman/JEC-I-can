
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
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
Example:
A: Hello.
B: (___)
Scenarios: Wh- questions (Price/Time), Health/Feelings, Ownership, Invitations, Information gaps.
Choices must be complete sentences or standard phrases. All blanks MUST be exactly "(___)".`;

const GRADE_4_PART_3_PROMPT = `Section 3: Sentence Rearranging (Questions 21–25)
Instructions: Provide a Japanese meaning, EXACTLY 5 scrambled fragments (as 'context'), and a 5-slot skeleton.
CRITICAL RULE: Grade 4 Part 3 ALWAYS asks for the combination of the 2nd and 4th words in the correctly ordered sentence.
1. 'skeleton' MUST contain exactly 5 blanks/boxes: "(___) [ 2 ] (___) [ 4 ] (___)".
2. IMPORTANT: Add fixed English words at the start or end if needed for grammar.
3. CAPS RULE: NEVER capitalize the first word of the sentence unless it is "I", a proper noun, or an abbreviation.
4. 'options' MUST be 4 strings of hyphenated pairs (IDs 1-5), e.g., "3-5".
5. 'correctAnswer' MUST be the 0-based index (0, 1, 2, or 3) of the correct pair in the 'options' array.
6. 'context' MUST be a list of 5 fragments.
Grammar: To-infinitive, Time Clauses, Phrasal Verbs, Comparison, Gerunds.`;

const GRADE_5_PART_3_PROMPT = `Section 3: Sentence Rearranging (Questions 21–25)
Instructions: Provide a Japanese meaning, EXACTLY 4 scrambled fragments (as 'context'), and a 4-slot skeleton.
CRITICAL RULE: Grade 5 Part 3 ALWAYS asks for the combination of the 1st and 3rd words.
1. 'skeleton' MUST contain exactly 4 blanks/boxes: "[ 1 ] (___) [ 3 ] (___)". 
2. IMPORTANT: Add fixed English words at the start or end if needed for grammar.
3. CAPS RULE: NEVER capitalize the first word of the sentence unless it is "I", a proper noun, or an abbreviation.
4. 'options' MUST be 4 strings of hyphenated pairs (IDs 1-4), e.g., "1-3".
5. 'correctAnswer' MUST be the 0-based index (0, 1, 2, or 3) of the correct pair in the 'options' array.
6. 'context' MUST be a list of 4 fragments.
Simple grammar: basic verbs, daily activities. All blanks must be "(___)".`;

const GRADE_4_PART_4_PROMPT = `Section 4: Reading Comprehension (Questions 26–35)
CRITICAL FORMATTING RULES FOR 'context' FIELD:
- DO NOT use any HTML tags (e.g., <br>, <div>, <b>).
- USE ONLY standard newline characters (\\n) for layout.

- FOR FLYERS/NOTICES (Q26–27): Format like a professional paper flyer.
  1. Start with a [TITLE] in ALL CAPS.
  2. Follow the title with a dashed divider line: "------------------------------------------".
  3. Use clear labels followed by a colon and space: "Date:", "Time:", "Place:", "Fee:".
  4. Ensure each detail is on its own line using \\n.
  5. Use bullet points (•) for the main announcement body text.

- FOR EMAILS (Q28–30): Format like a real email application.
  1. Include headers "From:", "To:", and "Subject:". 
  2. Each header MUST be on a new line using \\n.
  3. Follow headers with a separator line: "__________________________________________".
  4. Include a formal greeting like "Dear [Name]," followed by two line breaks (\\n\\n).
  5. Use 3 short body paragraphs separated by double line breaks (\\n\\n).

- FOR NARRATIVES (Q31–35):
  1. Use a [STORY TITLE] at the top.
  2. Use 3-4 distinct paragraphs separated by double line breaks (\\n\\n).

Theme Requirements:
- Q26–27: Flyer or Club Announcement.
- Q28–30: Email correspondence.
- Q31–35: Narrative story.
All blanks in questions MUST be "(___)".`;

const SECTION_DEFS: Record<TargetSection, string> = {
  PART_1: `Section 1. Vocabulary and Grammar. Short conversations or single sentences. Focus on daily life. All blanks MUST be "(___)".`,
  PART_2: GRADE_4_PART_2_PROMPT,
  PART_3: "DYNAMIC_PROMPT", 
  PART_4: GRADE_4_PART_4_PROMPT
};

const GRADE_CONFIGS: Partial<Record<EikenGrade, any>> = {
  'GRADE_5': {
    instructions: `LEVEL: Eiken Grade 5.`,
    counts: { PART_1: 15, PART_2: 5, PART_3: 5 }
  },
  'GRADE_4': {
    instructions: `LEVEL: Eiken Grade 4.`,
    counts: { PART_1: 15, PART_2: 5, PART_3: 5, PART_4: 10 }
  }
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
    context: { type: Type.STRING, description: "Numbered fragments for Part 3. Passage for Part 4." },
    text: { type: Type.STRING, description: "Japanese meaning for Part 3. Question text for others. Blanks MUST be '(___)'." },
    skeleton: { type: Type.STRING, description: "Sentence with boxes. Grade 4: [ 2 ] and [ 4 ]. Grade 5: [ 1 ] and [ 3 ]." },
    options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array of 4 options. For Part 3, hyphenated pairs like '2-4'." },
    correctAnswer: { type: Type.INTEGER, description: "CRITICAL: The 0-based index of the correct answer in the 'options' array (0 to 3). 0 = first option." },
    explanation: { type: Type.STRING, description: "CRITICAL: Detailed explanation of why the answer is correct, written in JAPANESE." },
    category: { type: Type.STRING }
  },
  required: ["type", "text", "options", "correctAnswer", "explanation"]
};

export async function* streamQuestions(grade: EikenGrade, section: TargetSection, theme?: string): AsyncGenerator<Question> {
  const config = GRADE_CONFIGS[grade] || GRADE_CONFIGS['GRADE_4']!;
  const count = config.counts[section] || 5;
  
  let sectionPrompt = SECTION_DEFS[section];
  if (section === 'PART_3') {
    sectionPrompt = grade === 'GRADE_5' ? GRADE_5_PART_3_PROMPT : GRADE_4_PART_3_PROMPT;
  }
  
  const targetType = TYPE_MAPPINGS[section];
  const themeInjection = theme 
    ? `SPECIFIC THEME FOCUS: Center content around "${theme}".` 
    : `GENERAL VARIETY: Use authentic themes like ${AUTHENTIC_THEMES.slice(0, 5).join(', ')}.`;

  const prompt = `Generate exactly ${count} Eiken ${grade.replace('_', ' ')} questions for ${section}.
    ${sectionPrompt}
    ${themeInjection}
    
    CRITICAL FORMATTING RULES:
    1. All blanks MUST be exactly "(___)".
    2. Dialogues MUST have a line break (\\n) between speakers.
    3. FOR PART 3 (REARRANGING): 
       - FOR GRADE 5: 4 fragments, skeleton like "[ 1 ] (___) [ 3 ] (___)".
       - FOR GRADE 4: 5 fragments, skeleton like "(___) [ 2 ] (___) [ 4 ] (___)".
       - 'options' MUST be hyphenated number pairs.
       - CAPS RULE: NEVER capitalize the start of the sentence unless it is "I", a proper noun, or an abbreviation.
    4. CORRECTNESS: 'correctAnswer' MUST be a 0-based index (0, 1, 2, or 3).
    5. LANGUAGE: 'explanation' MUST be written in Japanese.
    
    Return ONLY a JSON array matching the provided schema. 'type' MUST be "${targetType}".`;

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: questionSchema } as any,
        temperature: 0.9,
      },
    });

    const questions: any[] = JSON.parse(response.text);
    for (const q of questions) {
      yield { ...q, id: Math.random(), category: section, type: targetType };
    }
  } catch (error: any) {
    console.error("STREAM_ERROR:", error);
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
  
  const prompt = `Generate ONE new Eiken ${grade.replace('_', ' ')} question for ${section} to replace the original.
  
  CRITICAL FORMATTING RULES:
  1. All blanks MUST be "(___)".
  2. Dialogue line breaks (\\n) required.
  3. CORRECTNESS: 'correctAnswer' MUST be a 0-based index (0, 1, 2, or 3).
  4. LANGUAGE: 'explanation' MUST be written in Japanese.
  5. FOR PART 3: 
     - GRADE 5: 4 fragments, 1-3 skeleton.
     - GRADE 4: 5 fragments, 2-4 skeleton.
     - NEVER capitalize the first word unless "I", proper noun, or abbreviation.
  
  It MUST be type ${targetType}. ${sectionPrompt}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: questionSchema as any,
      temperature: 1.0,
    },
  });

  const newQ = JSON.parse(response.text);
  return { ...newQ, id: original.id, category: original.category, type: targetType };
}
