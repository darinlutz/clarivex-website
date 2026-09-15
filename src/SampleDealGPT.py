from langchain_openai import ChatOpenAI

from dotenv import load_dotenv

load_dotenv()
client = ChatOpenAI(model="gpt-4o")

response = client.invoke([
    {"role": "system", "content": "You are a helpful assistant that provides information about the best places to watch the sunset."},
    {"role": "user", "content": "What is the the best place to watch the sun set?"}
])


print(response.content)

