import { ChatOpenAI } from '@langchain/openai';
import { createAgent } from 'langchain';
import { getCurrentDateTool, tavilySearchTool } from './financialAnalysis';

// General-purpose agent for the Trip Planner's Agents tab: follows the user's instructions,
// searching the web when it needs current information.
const agent = createAgent({
  model: new ChatOpenAI({ model: 'gpt-4o', temperature: 0 }),
  tools: [tavilySearchTool, getCurrentDateTool],
  systemPrompt:
    'You are a helpful agent. Carry out the user\'s instructions completely. Use the web search tool whenever ' +
    'the task needs current or factual information you are not sure of, and cite the URLs you relied on. ' +
    'Reply in plain text (no Markdown).',
});

export async function runAgent(instructions: string): Promise<string> {
  const result = await agent.invoke({ messages: [{ role: 'user', content: instructions }] });
  const content = result.messages[result.messages.length - 1].content;
  return typeof content === 'string' ? content : JSON.stringify(content);
}
