import { Annotation, StateGraph, START, END } from '@langchain/langgraph';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

// Published-to-web CSV export of the user's personal Vietnamese vocabulary notes.
const VOCAB_SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1IFBHrYHXXnM2QgdhRekn7OhQ7mIkun46IKQjO1agw_4/export?format=csv&gid=0';

// The sheet lays out several categories side-by-side (English | Vietnamese
// column pairs, separated by blank spacer columns): row 1 holds the category
// names, row 2 the "English"/"Vietnamese" sub-headers, row 3 is blank, and
// data starts at row 4 (all 0-indexed).
const CATEGORY_HEADER_ROW = 1;
const DATA_START_ROW = 4;

// Pre-made example sentences the user already knows; excluded from the
// "vocabulary to build a new sentence from" pool, since the goal is a sentence
// they haven't already memorized.
const EXCLUDED_CATEGORY = 'SENTENCES';

export type Difficulty = 'easy' | 'medium' | 'hard';

const MAX_WORDS_PER_CATEGORY: Record<Difficulty, number> = {
  easy: 3,
  medium: 6,
  hard: 10,
};

const DIFFICULTY_INSTRUCTIONS: Record<Difficulty, string> = {
  easy:
    'Keep the sentence VERY SIMPLE: 3-5 words total, a basic subject-verb-object (or simpler) ' +
    'structure, and no conjunctions, clauses, or extra descriptive words.',
  medium:
    'Make the sentence MODERATELY COMPLEX: about 6-9 words, optionally including one adjective, ' +
    'preposition, number, or simple conjunction.',
  hard:
    'Make the sentence MORE COMPLEX: 10 or more words, combining multiple categories (e.g. numbers, ' +
    'classifiers, conjunctions, possession statements) with richer grammar and structure.',
};

interface VocabEntry {
  category: string;
  english: string;
  vietnamese: string;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += char;
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (char === ',') {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (char === '\r') {
      i++;
      continue;
    }
    if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
      continue;
    }

    field += char;
    i++;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

async function fetchVocabulary(): Promise<VocabEntry[]> {
  const res = await fetch(VOCAB_SHEET_CSV_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch Vietnamese notes sheet (${res.status})`);
  }
  const text = await res.text();
  const rows = parseCsv(text);

  const headerRow = rows[CATEGORY_HEADER_ROW] ?? [];
  const categories: Array<{ name: string; col: number }> = [];
  headerRow.forEach((cell, col) => {
    const name = cell.trim();
    if (name) categories.push({ name, col });
  });

  const entries: VocabEntry[] = [];
  for (let r = DATA_START_ROW; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    for (const { name, col } of categories) {
      const english = (row[col] ?? '').trim();
      const vietnamese = (row[col + 1] ?? '').trim();
      if (english && vietnamese) {
        entries.push({ category: name, english, vietnamese });
      }
    }
  }

  if (entries.length === 0) {
    throw new Error('No vocabulary entries found in the Vietnamese notes sheet');
  }

  return entries;
}

function sampleVocabulary(entries: VocabEntry[], difficulty: Difficulty): VocabEntry[] {
  const byCategory = new Map<string, VocabEntry[]>();
  for (const entry of entries) {
    if (entry.category === EXCLUDED_CATEGORY) continue;
    const list = byCategory.get(entry.category) ?? [];
    list.push(entry);
    byCategory.set(entry.category, list);
  }

  const maxPerCategory = MAX_WORDS_PER_CATEGORY[difficulty];
  const sample: VocabEntry[] = [];
  for (const list of byCategory.values()) {
    const shuffled = [...list].sort(() => Math.random() - 0.5);
    sample.push(...shuffled.slice(0, maxPerCategory));
  }

  return sample;
}

function formatVocabularyForPrompt(entries: VocabEntry[]): string {
  const byCategory = new Map<string, VocabEntry[]>();
  for (const entry of entries) {
    const list = byCategory.get(entry.category) ?? [];
    list.push(entry);
    byCategory.set(entry.category, list);
  }

  return Array.from(byCategory.entries())
    .map(([category, items]) => {
      const wordList = items.map((i) => `${i.vietnamese} (${i.english})`).join(', ');
      return `${category}: ${wordList}`;
    })
    .join('\n');
}

const SentenceSchema = z.object({
  vietnamese: z
    .string()
    .describe('A new Vietnamese practice sentence, written with correct diacritics'),
  english: z.string().describe('The natural English translation of the Vietnamese sentence'),
});

const promptTemplate = ChatPromptTemplate.fromMessages([
  [
    'system',
    'You are a Vietnamese language tutor helping a student practice with words they already know.\n' +
      'Using ONLY the vocabulary listed below (you may add minimal grammatical glue words such as ' +
      '"là", "không", or "của" only if strictly necessary for correct grammar), construct ONE new, ' +
      'natural Vietnamese sentence the student has not necessarily seen before. Vary the grammar and ' +
      'topic each time.\n\n' +
      '{difficultyInstructions}\n\n' +
      'Known vocabulary:\n{vocabulary}',
  ],
  ['user', 'Give me a new sentence to practice.'],
]);

const LanguageState = Annotation.Root({
  difficulty: Annotation<Difficulty>,
  vocabulary: Annotation<VocabEntry[]>,
  vietnamese: Annotation<string>,
  english: Annotation<string>,
});

type LanguageStateType = typeof LanguageState.State;

async function fetchVocabularyNode(): Promise<Partial<LanguageStateType>> {
  const vocabulary = await fetchVocabulary();
  return { vocabulary };
}

async function generateSentenceNode(
  state: LanguageStateType
): Promise<Partial<LanguageStateType>> {
  const sample = sampleVocabulary(state.vocabulary, state.difficulty);
  const vocabularyText = formatVocabularyForPrompt(sample);
  const difficultyInstructions = DIFFICULTY_INSTRUCTIONS[state.difficulty];

  const model = new ChatOpenAI({ model: 'gpt-4o', temperature: 1 });
  const structuredModel = model.withStructuredOutput(SentenceSchema);
  const chain = promptTemplate.pipe(structuredModel);

  const response = await chain.invoke({
    vocabulary: vocabularyText,
    difficultyInstructions,
  });
  return { vietnamese: response.vietnamese, english: response.english };
}

// fetchVocabulary -> generateSentence today; future steps (e.g. spaced-repetition
// tracking) can be added as additional nodes in this graph.
const graph = new StateGraph(LanguageState)
  .addNode('fetchVocabulary', fetchVocabularyNode)
  .addNode('generateSentence', generateSentenceNode)
  .addEdge(START, 'fetchVocabulary')
  .addEdge('fetchVocabulary', 'generateSentence')
  .addEdge('generateSentence', END)
  .compile();

export async function getRandomSentence(
  difficulty: Difficulty = 'easy'
): Promise<{ vietnamese: string; english: string }> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const finalState = await graph.invoke({ difficulty });

  if (!finalState.vietnamese || !finalState.english) {
    throw new Error('Language graph did not return a sentence');
  }

  return { vietnamese: finalState.vietnamese, english: finalState.english };
}

type WordCategory = 'nouns' | 'verbs' | 'adjectives';

const CATEGORY_WORD_EXAMPLES: Record<WordCategory, { pattern: string; examples: string[] }> = {
  nouns: {
    pattern: 'Return a single Vietnamese noun (like "sách" (book), "chó" (dog), "nhà" (house)). Include the English translation.',
    examples: ['sách', 'chó', 'nhà', 'cái bàn', 'con mèo']
  },
  verbs: {
    pattern: 'Return a single Vietnamese verb (like "chạy" (run), "ăn" (eat), "ngủ" (sleep)). Include the English translation.',
    examples: ['chạy', 'ăn', 'ngủ', 'đi', 'nói']
  },
  adjectives: {
    pattern: 'Return a single Vietnamese adjective (like "đỏ" (red), "to" (big), "nhanh" (fast)). Include the English translation.',
    examples: ['đỏ', 'to', 'nhanh', 'đen', 'nhỏ']
  }
};

const WordSchema = z.object({
  vietnamese: z.string().describe('A single Vietnamese word with correct diacritics'),
  english: z.string().describe('The English translation of the Vietnamese word'),
});

export async function getRandomWord(
  category: WordCategory = 'nouns'
): Promise<{ vietnamese: string; english: string }> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const categoryInfo = CATEGORY_WORD_EXAMPLES[category];
  
  const model = new ChatOpenAI({ model: 'gpt-4o', temperature: 1 });
  const structuredModel = model.withStructuredOutput(WordSchema);
  
  const wordPrompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      'You are a Vietnamese language tutor. ' + categoryInfo.pattern
    ],
    ['user', `Give me a single ${category === 'nouns' ? 'noun' : category === 'verbs' ? 'verb' : 'adjective'} word to practice.`],
  ]);

  const chain = wordPrompt.pipe(structuredModel);
  const response = await chain.invoke({});

  if (!response.vietnamese || !response.english) {
    throw new Error('Failed to generate a word');
  }

  return { vietnamese: response.vietnamese, english: response.english };
}
