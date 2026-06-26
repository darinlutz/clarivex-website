import { execFile } from 'node:child_process';
import path from 'node:path';
import { Annotation, StateGraph, START, END, messagesStateReducer } from '@langchain/langgraph';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { createAgent, tool } from 'langchain';
import { z } from 'zod';

const MODEL_NAME = 'gpt-4o';
const PLOT_SCRIPT_PATH = path.join(process.cwd(), 'plot_stock.py');
const TICKER_PATTERN = /^[A-Za-z.]{1,10}$/;

const getCurrentDateTool = tool(
  async () =>
    `The current date is: ${new Date().toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })}`,
  {
    name: 'get_current_date',
    description: 'Returns the current date. Use this tool first for any time-based queries.',
    schema: z.object({}),
  }
);

const tavilySearchTool = tool(
  async ({ query }: { query: string }) => {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      throw new Error('TAVILY_API_KEY is not configured');
    }

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, query, max_results: 5 }),
    });

    if (!response.ok) {
      throw new Error(`Tavily search failed: ${response.statusText}`);
    }

    const data = await response.json();
    const results = (data.results ?? []) as Array<{ title: string; url: string; content: string }>;

    if (results.length === 0) {
      return 'No results found.';
    }

    return results.map((result) => `${result.title} (${result.url})\n${result.content}`).join('\n\n');
  },
  {
    name: 'tavily_search',
    description: 'Searches the web for current information and returns relevant results.',
    schema: z.object({ query: z.string().describe('The search query') }),
  }
);

const alphaVantageTool = tool(
  async ({ ticker }: { ticker: string }) => {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      throw new Error('ALPHA_VANTAGE_API_KEY is not configured');
    }

    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(
      ticker
    )}&apikey=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Alpha Vantage request failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data['Error Message'] || data['Note'] || data['Information']) {
      return data['Error Message'] || data['Note'] || data['Information'];
    }

    const series = data['Time Series (Daily)'] as Record<string, Record<string, string>> | undefined;
    if (!series) {
      return 'No time series data found for that ticker.';
    }

    const recentDates = Object.keys(series).sort().reverse().slice(0, 7);
    const lines = recentDates.map((date) => {
      const day = series[date];
      return `${date}: open=${day['1. open']} high=${day['2. high']} low=${day['3. low']} close=${day['4. close']} volume=${day['5. volume']}`;
    });

    return lines.join('\n');
  },
  {
    name: 'alpha_vantage',
    description:
      'Gets financial information about stocks (daily open, high, low, close, volume). Input should be the stock ticker symbol.',
    schema: z.object({ ticker: z.string().describe('The stock ticker symbol, e.g. AAPL') }),
  }
);

const baseModel = () => new ChatOpenAI({ model: MODEL_NAME, temperature: 0 });

const webSearchAgent = createAgent({
  model: baseModel(),
  tools: [tavilySearchTool, getCurrentDateTool],
  systemPrompt:
    'You are a web search agent. Your role is to use web search tools to find information and return comprehensive answers to queries.',
});

const financialAgent = createAgent({
  model: baseModel(),
  tools: [alphaVantageTool, getCurrentDateTool],
  systemPrompt:
    'You are a financial analysis agent. Your role is to use the Alpha Vantage tool to gather financial data and ' +
    'provide concise, informative answers. Do not generate charts or plots. Only use the tools provided to you ' +
    'and return a clear, text-based analysis or result.',
});

interface ChartScriptResult {
  image?: string;
  error?: string;
}

function generateStockChart(ticker: string, days: number): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!TICKER_PATTERN.test(ticker)) {
      reject(new Error(`Invalid ticker symbol: "${ticker}"`));
      return;
    }

    const clampedDays = Math.min(Math.max(Math.round(days) || 365, 1), 1825);

    execFile(
      'python',
      [PLOT_SCRIPT_PATH, '--ticker', ticker, '--days', String(clampedDays)],
      { env: process.env, timeout: 30000, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        let parsed: ChartScriptResult | undefined;
        try {
          parsed = JSON.parse(stdout.trim());
        } catch {
          parsed = undefined;
        }

        if (parsed?.error) {
          reject(new Error(parsed.error));
          return;
        }

        if (error) {
          reject(new Error(stderr.trim() || error.message));
          return;
        }
        if (!parsed?.image) {
          reject(new Error('Chart script returned no image data'));
          return;
        }

        resolve(`data:image/png;base64,${parsed.image}`);
      }
    );
  });
}

const ChartRequestSchema = z.object({
  ticker: z.string().describe('The stock ticker symbol to chart, e.g. AAPL'),
  days: z
    .number()
    .int()
    .describe('The number of trailing days of closing-price data to plot, e.g. 365 for "the last year"'),
});

const chartExtractionPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    'You determine the parameters for a stock price chart based on the conversation so far, including any ' +
      "ticker symbols or data already gathered by the financial analysis agent. Identify the stock ticker " +
      'the user wants charted and how many trailing days of data to include (default to 365 if unspecified).',
  ],
  new MessagesPlaceholder('messages'),
]);

const MEMBERS = {
  WebSearchAgent: 'An agent that performs web searches to gather information',
  FinancialAgent: 'An agent that analyzes financial data using the Alpha Vantage tool to acquire stock market information',
  CodeAgent: 'An agent that generates a real stock closing-price chart image from live market data. Use this when the user asks for a plot, chart, or graph',
} as const;

type MemberName = keyof typeof MEMBERS;

const ROUTE_OPTIONS = ['FINISH', 'WebSearchAgent', 'FinancialAgent', 'CodeAgent'] as const;

const RouteResponseSchema = z.object({
  next: z.enum(ROUTE_OPTIONS).describe('The next agent that should act, or FINISH if the task is complete'),
});

const membersDescription = Object.entries(MEMBERS)
  .map(([name, description]) => `- ${name}: ${description}`)
  .join('\n');

const supervisorSystemPrompt =
  'You are a highly efficient supervisor managing a collaborative conversation between specialized agents:\n' +
  `${membersDescription}\n` +
  'Your role is to:\n' +
  "1. Analyze the user's request and the ongoing conversation.\n" +
  '2. Determine which agent is best suited to handle the next task.\n' +
  '3. Ensure a logical flow of information and task execution.\n' +
  "4. Respond with 'FINISH' as soon as an agent has provided a sufficient answer to the user's request. In " +
  "particular, once the CodeAgent has generated a chart (whether it succeeded or reported an error), the " +
  "visualization task is complete and you must respond with 'FINISH' — never call CodeAgent, FinancialAgent, " +
  'or WebSearchAgent again for the same request after that.\n' +
  '5. Facilitate seamless transitions between agents as needed, but never call the same agent twice in a row ' +
  'for the same request.\n' +
  "6. Conclude the process by responding with 'FINISH' when all objectives are met. Remember, each agent has " +
  'unique capabilities, so choose wisely based on the current needs of the task.';

const supervisorPrompt = ChatPromptTemplate.fromMessages([
  ['system', supervisorSystemPrompt],
  new MessagesPlaceholder('messages'),
  ['system', `Based on the conversation, who should act next? Choose one of: ${ROUTE_OPTIONS.join(', ')}`],
]);

const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  next: Annotation<string>({
    reducer: (_current, update) => update,
    default: () => '',
  }),
  chart: Annotation<string | null>({
    reducer: (_current, update) => update,
    default: () => null,
  }),
});

type AgentStateType = typeof AgentState.State;

async function supervisorNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const structuredModel = baseModel().withStructuredOutput(RouteResponseSchema);
  const chain = supervisorPrompt.pipe(structuredModel);
  const response = await chain.invoke({ messages: state.messages });
  return { next: response.next };
}

function toAgentMessage(content: BaseMessage['content'], name: MemberName): AIMessage {
  return new AIMessage({ content, name });
}

async function webSearchNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const result = await webSearchAgent.invoke({ messages: state.messages });
  const lastMessage = result.messages[result.messages.length - 1];
  return { messages: [toAgentMessage(lastMessage.content, 'WebSearchAgent')] };
}

async function financialNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const result = await financialAgent.invoke({ messages: state.messages });
  const lastMessage = result.messages[result.messages.length - 1];
  return { messages: [toAgentMessage(lastMessage.content, 'FinancialAgent')] };
}

async function codeNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const structuredModel = baseModel().withStructuredOutput(ChartRequestSchema);
  const chain = chartExtractionPrompt.pipe(structuredModel);
  const { ticker, days } = await chain.invoke({ messages: state.messages });

  try {
    const chart = await generateStockChart(ticker, days);
    return {
      chart,
      messages: [toAgentMessage(`Generated a ${days}-day closing price chart for ${ticker.toUpperCase()}.`, 'CodeAgent')],
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown error';
    return {
      messages: [toAgentMessage(`Could not generate a chart for ${ticker.toUpperCase()}: ${reason}`, 'CodeAgent')],
    };
  }
}

const graph = new StateGraph(AgentState)
  .addNode('WebSearchAgent', webSearchNode)
  .addNode('FinancialAgent', financialNode)
  .addNode('CodeAgent', codeNode)
  .addNode('Supervisor', supervisorNode)
  .addEdge('WebSearchAgent', 'Supervisor')
  .addEdge('FinancialAgent', 'Supervisor')
  .addEdge('CodeAgent', 'Supervisor')
  .addConditionalEdges('Supervisor', (state) => state.next, {
    WebSearchAgent: 'WebSearchAgent',
    FinancialAgent: 'FinancialAgent',
    CodeAgent: 'CodeAgent',
    FINISH: END,
  })
  .addEdge(START, 'Supervisor')
  .compile();

const MAX_STEPS = 10;

export interface FinancialAnalysisResult {
  result: string;
  chart: string | null;
}

export async function runFinancialAnalysis(query: string): Promise<FinancialAnalysisResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  if (!process.env.TAVILY_API_KEY) {
    throw new Error('TAVILY_API_KEY is not configured');
  }
  if (!process.env.ALPHA_VANTAGE_API_KEY) {
    throw new Error('ALPHA_VANTAGE_API_KEY is not configured');
  }

  const finalState = await graph.invoke(
    { messages: [new HumanMessage(query)] },
    { recursionLimit: MAX_STEPS * 2 + 1 }
  );

  const agentMessages = finalState.messages.filter(
    (message): message is AIMessage => message instanceof AIMessage && !!message.name
  );
  const lastAgentMessage = agentMessages[agentMessages.length - 1];

  if (!lastAgentMessage) {
    throw new Error('Financial analysis graph did not return a result');
  }

  const result =
    typeof lastAgentMessage.content === 'string'
      ? lastAgentMessage.content
      : JSON.stringify(lastAgentMessage.content);

  return { result, chart: finalState.chart };
}
