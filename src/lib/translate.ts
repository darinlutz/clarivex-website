import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

export type Language = 'Arabic' | 'English' | 'German' | 'Japanese' | 'Vietnamese';

const TranslationSchema = z.object({
  translation: z.string().describe('The translated text'),
});

const PROMPT_TEMPLATE = ChatPromptTemplate.fromMessages([
  [
    'system',
    'You are a {fromLanguage}-to-{toLanguage} translator. Translate the given {fromLanguage} ' +
      'text into natural, accurate {toLanguage}, preserving the original meaning and tone as ' +
      'closely as possible.',
  ],
  ['user', '{text}'],
]);

export async function translateText(
  text: string,
  fromLanguage: Language,
  toLanguage: Language
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const model = new ChatOpenAI({ model: 'gpt-4o', temperature: 0 });
  const structuredModel = model.withStructuredOutput(TranslationSchema);
  const chain = PROMPT_TEMPLATE.pipe(structuredModel);

  const response = await chain.invoke({ text, fromLanguage, toLanguage });
  return response.translation;
}
