import { Annotation, StateGraph, START, END } from '@langchain/langgraph';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { Difficulty, fetchVocabulary, VocabEntry } from './language';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Pre-made example sentences are excluded so the friend asks about vocabulary
// words rather than quizzing on sentences the user already has memorized.
const EXCLUDED_CATEGORY = 'SENTENCES';
const MAX_VOCAB_WORDS = 40;

const DIFFICULTY_INSTRUCTIONS: Record<Difficulty, string> = {
  easy:
    'Ask VERY SIMPLE questions: 3-6 words, basic present-tense grammar, one idea at a time, ' +
    'no conjunctions or clauses.',
  medium:
    'Ask MODERATELY COMPLEX questions: about 7-10 words, optionally including an adjective, ' +
    'preposition, number, or simple conjunction.',
  hard:
    'Ask MORE COMPLEX questions: 11 or more words, combining multiple ideas, tenses, or clauses ' +
    'with richer grammar and structure.',
};

function sampleVocabulary(entries: VocabEntry[]): VocabEntry[] {
  const pool = entries.filter((entry) => entry.category !== EXCLUDED_CATEGORY);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, MAX_VOCAB_WORDS);
}

function formatVocabularyForPrompt(entries: VocabEntry[]): string {
  return entries.map((entry) => `${entry.vietnamese} (${entry.english})`).join(', ');
}

const promptTemplate = ChatPromptTemplate.fromMessages([
  [
    'system',
    'You are a friendly Vietnamese-speaking pen pal helping the user practice conversational ' +
      'Vietnamese. Ask the user questions in Vietnamese, drawing mainly from the vocabulary words ' +
      "listed below. After the user replies, briefly react to their answer (acknowledge it, gently " +
      'correct any mistakes) and then ask a new question on a different topic. Always write every ' +
      'message in Vietnamese only, with correct diacritics, and keep each message short ' +
      '(1-3 sentences).\n\n{difficultyInstructions}\n\nKnown vocabulary:\n{vocabulary}',
  ],
  new MessagesPlaceholder('history'),
]);

const FriendState = Annotation.Root({
  history: Annotation<ChatMessage[]>,
  difficulty: Annotation<Difficulty>,
  vocabulary: Annotation<VocabEntry[]>,
  reply: Annotation<string>,
});

type FriendStateType = typeof FriendState.State;

async function fetchVocabularyNode(): Promise<Partial<FriendStateType>> {
  const entries = await fetchVocabulary();
  return { vocabulary: sampleVocabulary(entries) };
}

async function chatNode(state: FriendStateType): Promise<Partial<FriendStateType>> {
  const vocabularyText = formatVocabularyForPrompt(state.vocabulary);
  const difficultyInstructions = DIFFICULTY_INSTRUCTIONS[state.difficulty];
  const history: BaseMessage[] = state.history.map((message) =>
    message.role === 'user' ? new HumanMessage(message.content) : new AIMessage(message.content)
  );

  const model = new ChatOpenAI({ model: 'gpt-4o', temperature: 0.7 });
  const chain = promptTemplate.pipe(model);

  const response = await chain.invoke({ vocabulary: vocabularyText, difficultyInstructions, history });
  const reply =
    typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

  return { reply };
}

// fetchVocabulary -> chat today; future steps (e.g. tracking which words the
// user struggles with) can be added as additional nodes in this graph.
const graph = new StateGraph(FriendState)
  .addNode('fetchVocabulary', fetchVocabularyNode)
  .addNode('chat', chatNode)
  .addEdge(START, 'fetchVocabulary')
  .addEdge('fetchVocabulary', 'chat')
  .addEdge('chat', END)
  .compile();

export async function chatWithFriend(
  history: ChatMessage[],
  difficulty: Difficulty = 'medium'
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const finalState = await graph.invoke({ history, difficulty });

  if (!finalState.reply) {
    throw new Error('Friend chat graph did not return a reply');
  }

  return finalState.reply;
}
