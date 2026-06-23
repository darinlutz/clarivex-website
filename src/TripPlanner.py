from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from dotenv import load_dotenv
_ = load_dotenv()

model = ChatOpenAI(model="gpt-4o")

system_template = """
You are a trip planner expert. Help me plan a trip to {destination}.
Consider my preferences for {preferences}.
"""

prompt_template = ChatPromptTemplate.from_messages([
    ('system', system_template),
    ('user', 'What should I do in {destination}?')
])

parser = StrOutputParser()

trip_planner_chain = prompt_template | model | parser

def plan_trip(destination, preferences):
    input_data = {"destination": destination, "preferences": preferences}
    return trip_planner_chain.invoke(input_data)


# helper function to render markdown
from IPython.display import Markdown, display

def render_markdown(md_string):
    display(Markdown(md_string))

    result = plan_trip("Paris", "museums, cafes, historical sites")
render_markdown(result)