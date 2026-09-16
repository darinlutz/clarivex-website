from langchain_openai import ChatOpenAI

from dotenv import load_dotenv

load_dotenv()
client = ChatOpenAI(model="gpt-4o")

response = client.invoke([
    {"role": "system", "content": "You are a translator."},
    {"role": "user", "content": "Translate these sentences: 'Hello' -> 'Hola', 'Goodbye' -> 'Adiós'. Now translate: 'Thank you'."}
])


print(response.content)

