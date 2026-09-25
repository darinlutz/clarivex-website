from langchain_openai import ChatOpenAI

from dotenv import load_dotenv
from pathlib import Path

# The keys (OPENAI_API_KEY, etc.) live in ".env.local" at the project root,
# which load_dotenv() doesn't look for by default; point at it explicitly.
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env.local")
client = ChatOpenAI(model="gpt-4o")

response = client.invoke([
    {"role": "system", "content": "You are a translator."},
    {"role": "user", "content": "Translate these sentences: 'Hello' -> 'Hola', 'Goodbye' -> 'Adiós'. Now translate: 'Thank you'."}
])


print(response.content)

