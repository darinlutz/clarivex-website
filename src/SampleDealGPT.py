from langchain_openai import ChatOpenAI

from dotenv import load_dotenv
from pathlib import Path

# The keys (OPENAI_API_KEY, etc.) live in ".env.local" at the project root,
# which load_dotenv() doesn't look for by default; point at it explicitly.
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env.local")
client = ChatOpenAI(model="gpt-4o")

response = client.invoke([
    {"role": "system", "content": "You are a helpful assistant that provides information about the best places to watch the sunset."},
    {"role": "user", "content": "What is the the best place to watch the sun set?"}
])


print(response.content)

