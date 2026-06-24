import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

const TranslationSchema = z.object({
  english: z.string().describe('The natural English translation of the given Vietnamese text'),
});

const promptTemplate = ChatPromptTemplate.fromMessages([
  [
    'system',
    'You are a Vietnamese-to-English translator. Translate the given Vietnamese text into ' +
      'natural, accurate English, preserving the original meaning and tone as closely as possible.',
  ],
  ['user', '{text}'],
]);

export async function translateToEnglish(text: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const model = new ChatOpenAI({ model: 'gpt-4o', temperature: 0 });
  const structuredModel = model.withStructuredOutput(TranslationSchema);
  const chain = promptTemplate.pipe(structuredModel);

  const response = await chain.invoke({ text });
  return response.english;
}
