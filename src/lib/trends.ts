// Looks up what's trending on Google Trends using OpenAI's built-in web
// search tool (Responses API), so ChatGPT itself does the searching.

const TRENDS_MODEL = 'gpt-4.1';

function buildPrompt(focus: string): string {
  return (
    `Today is ${new Date().toDateString()}. Search Google Trends (trends.google.com, the ` +
    '"Trending now" page) for the current top trending searches' +
    (focus ? `, focusing on: ${focus}` : ' in the United States') +
    '.\n\n' +
    'Reply in plain text with no Markdown (no **, #, or links). Give a numbered list of the top ' +
    '10 trends, each on its own line as "<number>. <trend> - <one short sentence on why it is ' +
    'trending>". Include the approximate search volume when Google Trends shows it. ' +
    'End with one line saying which region and time the list reflects.'
  );
}

type ResponsesOutput = {
  type: string;
  content?: { type: string; text?: string }[];
}[];

export async function getTopTrends(focus: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: TRENDS_MODEL,
      tools: [{ type: 'web_search' }],
      input: buildPrompt(focus.trim()),
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI web search failed (${response.status}): ${await response.text()}`);
  }

  const data = (await response.json()) as { output?: ResponsesOutput };
  const text = (data.output ?? [])
    .filter((item) => item.type === 'message')
    .flatMap((item) => item.content ?? [])
    .filter((part) => part.type === 'output_text' && part.text)
    .map((part) => part.text)
    .join('\n');

  const plain = stripCitations(text);
  if (!plain) {
    throw new Error('OpenAI web search returned no text');
  }
  return plain;
}

// Web search answers carry inline citations like "([site](url))" and
// Markdown links/bold even when asked not to; the results box is plain text.
function stripCitations(text: string): string {
  return text
    .replace(/\s*\(\[[^\]]*\]\([^)]*\)\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/[ \t]+$/gm, '')
    .trim();
}
