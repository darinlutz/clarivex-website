from pathlib import Path

from dotenv import load_dotenv
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

# This project keeps its keys (OPENAI_API_KEY, etc.) in ".env.local" at the
# project root, which load_dotenv() doesn't look for by default. Point at it
# explicitly, relative to this file so it works from any working directory.
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env.local")


# Define a prompt template
prompt = ChatPromptTemplate.from_template("tell me a joke about {topic}")

# Create a chat model
model = ChatOpenAI(model="gpt-4o-mini")

# Chain the prompt, model, and output parser
chain = prompt | model | StrOutputParser()

# Run the chain
response = chain.invoke({"topic": "lions"})
print(response)