"""Runs a web-search-augmented chat query against an Ollama cloud model.

Usage:
    python OllamaSearch.py "search query text"

Reads the Ollama API key from the OLLAMA_API_KEY environment variable,
which is required both for the cloud chat model and for the
web_search/web_fetch tools. Prints the model's final answer to stdout, or
exits non-zero and prints an error message to stderr.
"""

import sys
from datetime import datetime

from ollama import Client, web_fetch, web_search

MODEL = 'gemma4:31b'

# Runs the chat step against Ollama's cloud API instead of a local model.
# The client picks up the Bearer token from OLLAMA_API_KEY automatically.
cloud_client = Client(host='https://ollama.com')

# Web search results can return thousands of tokens, so the context window
# needs enough room to hold them alongside the rest of the conversation.
CONTEXT_LENGTH = 32768

# Guards against a model that keeps calling tools instead of answering.
MAX_TOOL_ROUNDS = 6

available_tools = {'web_search': web_search, 'web_fetch': web_fetch}


def run_search(query: str) -> str:
    # Without this, the model has no way to know "today" and tends to assume
    # a date near its training cutoff instead, which skews any time-based
    # reasoning (e.g. "latest", "this year"). Computed fresh per call since
    # each search spawns a new process anyway.
    today = datetime.now().strftime('%B %d, %Y')
    messages = [
        {
            'role': 'system',
            'content': (
                f"Today's date is {today}. Treat this as ground truth for any date- or "
                'time-based reasoning instead of assuming a date from your training data.'
            ),
        },
        {'role': 'user', 'content': query},
    ]

    for _ in range(MAX_TOOL_ROUNDS):
        response = cloud_client.chat(
            model=MODEL,
            messages=messages,
            tools=[web_search, web_fetch],
            think=True,
            options={'num_ctx': CONTEXT_LENGTH},
        )
        messages.append(response.message)

        if not response.message.tool_calls:
            return response.message.content or ''

        for tool_call in response.message.tool_calls:
            function_to_call = available_tools.get(tool_call.function.name)
            if function_to_call:
                args = tool_call.function.arguments
                result = function_to_call(**args)
                messages.append(
                    {
                        'role': 'tool',
                        'content': str(result)[: 2000 * 4],
                        'tool_name': tool_call.function.name,
                    }
                )
            else:
                messages.append(
                    {
                        'role': 'tool',
                        'content': f'Tool {tool_call.function.name} not found',
                        'tool_name': tool_call.function.name,
                    }
                )

    return 'Gave up after too many tool calls without a final answer.'


def main() -> None:
    if len(sys.argv) < 2 or not sys.argv[1].strip():
        print('No search query provided', file=sys.stderr)
        sys.exit(1)

    query = sys.argv[1]

    try:
        print(run_search(query))
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
