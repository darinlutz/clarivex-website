import contextlib
import io
import json
import sys
from pathlib import Path
from typing import Dict, List

import requests
from bs4 import BeautifulSoup
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_openai import ChatOpenAI

from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_core.prompts import ChatPromptTemplate

from dotenv import load_dotenv

# The keys (OPENAI_API_KEY, etc.) live in ".env.local" at the project root,
# which load_dotenv() doesn't look for by default; point at it explicitly.
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env.local")

# The vector store is saved to disk the first time it's built (and rebuilt
# whenever the URL list below changes), then reused so questions don't
# re-download and re-embed the pages.
QA_DB_PATH = str(Path(__file__).resolve().parent.parent / "qa_chroma_db")
QA_COLLECTION = "chatbot_qa"

model_name = "gpt-4o-mini"  # Ensure Up-to-date model initialization

# List of documents to process
documents = [
    "https://beebom.com/what-is-nft-explained/",
    "https://beebom.com/how-delete-servers-discord/",

]

#     "https://beebom.com/how-list-groups-linux/",
#    "https://beebom.com/how-open-port-linux/",
#    "https://beebom.com/linux-vs-windows/",

# Some sites reject the default python-requests User-Agent.
REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    )
}

# Page furniture that isn't article content
NON_CONTENT_TAGS = ["script", "style", "noscript", "nav", "footer", "header", "aside", "form", "svg", "iframe"]


def scrape_docs(urls: List[str]) -> List[Document]:
    """Fetch each URL with requests and pull the article text out with BeautifulSoup"""
    raw_docs = []
    for url in urls:
        try:
            response = requests.get(url, headers=REQUEST_HEADERS, timeout=30)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")
            for tag in soup(NON_CONTENT_TAGS):
                tag.decompose()

            content = soup.find("article") or soup.find("main") or soup.body or soup
            text = content.get_text("\n", strip=True)
            raw_docs.append(Document(page_content=text, metadata={"source": url}))

        except Exception as e:
            print(f"Error loading {url}: {str(e)}")

    print(f"\nSuccessfully loaded {len(raw_docs)} documents")

    # Print some information about the loaded documents
    for doc in raw_docs:
        print(f"\nSource: {doc.metadata.get('source', 'No source')}")
        print(f"Content length: {len(doc.page_content)} characters")

    return raw_docs


def create_vector_store(texts: List[str], metadatas: List[Dict]):
    """Create vector store using ChromaDB"""
    embeddings = OpenAIEmbeddings(
        model="text-embedding-3-small"
    )  # Ensure correct implementation
    db = Chroma.from_texts(texts=texts, metadatas=metadatas, embedding=embeddings)
    return db


def load_or_build_vector_store():
    """Reuse the saved vector store, building it from the URLs if it's empty
    or was built from a different URL list"""
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    sources_key = "\n".join(documents)

    def open_store():
        return Chroma(
            collection_name=QA_COLLECTION,
            embedding_function=embeddings,
            persist_directory=QA_DB_PATH,
            collection_metadata={"sources": sources_key},
        )

    db = open_store()
    saved_sources = (db._collection.metadata or {}).get("sources")
    if db._collection.count() > 0 and saved_sources != sources_key:
        print("URL list changed; rebuilding vector store...")
        db.delete_collection()
        db = open_store()

    if db._collection.count() == 0:
        print("Scraping documents...")
        pages_content = scrape_docs(documents)

        print("Splitting documents...")
        all_texts, all_metadatas = split_documents(pages_content)
        if not all_texts:
            raise RuntimeError("Could not load any of the source pages.")

        print("Creating vector store...")
        db.add_texts(texts=all_texts, metadatas=all_metadatas)

    return db


def setup_qa_chain(db):
    """Set up QA chain with polite response template"""
    llm = ChatOpenAI(model_name=model_name, temperature=0)
    retriever = db.as_retriever()

    # Create a custom prompt template
    prompt = ChatPromptTemplate.from_template(
        """
    Please provide a polite and helpful response to the following question, utilizing the provided context. 
    Ensure that the tone remains professional, courteous, and empathetic, and tailor your response to directly address the inquiry. 

### Context:
{context}

### Question: 
{question}

### Polite Response:
In your response, consider including:
- Acknowledge the user’s query and express gratitude for the opportunity to assist.
- Provide a clear and concise answer that directly addresses the question.
- Use positive language and maintain a supportive tone throughout.
- If applicable, include relevant information or resources that could help further.
- Conclude by inviting any follow-up questions or providing encouragement for the user’s pursuit of information."""
    )

    # Create the chain
    chain = (
        {"context": retriever, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )

    return chain, retriever  # Return both chain and retriever


def split_documents(pages_content: List[Dict]) -> tuple:
    """Split documents into chunks"""
    from langchain_text_splitters import RecursiveCharacterTextSplitter

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)

    all_texts, all_metadatas = [], []
    for document in pages_content:
        # Extract text from Document object
        text = document.page_content  # Changed from document to document.page_content
        source = document.metadata.get("source", "")  # Get source from metadata

        chunks = text_splitter.split_text(text)
        for chunk in chunks:
            all_texts.append(chunk)
            all_metadatas.append({"source": source})

    print(f"Created {len(all_texts)} chunks of text")
    return all_texts, all_metadatas


def process_query(chain_and_retriever, query: str):
    """Process a query and return response"""
    try:
        chain, retriever = chain_and_retriever  # Unpack the tuple

        # Get the response
        response = chain.invoke(query)

        # Get the sources using the retriever
        docs = retriever.invoke(query)
        sources_str = ", ".join([doc.metadata.get("source", "") for doc in docs])

        return {"answer": response, "sources": sources_str}
    except Exception as e:
        print(f"Error processing query: {str(e)}")
        return {
            "answer": "I apologize, but I encountered an error while processing your question.",
            "sources": "",
        }


def run_message(payload: dict) -> dict:
    """Handle one question for the web UI (one process per call, so the saved
    vector store is what carries the scraped pages between calls)."""
    message = payload.get("message", "")

    # The helpers print progress for the interactive mode below; keep stdout
    # for the JSON result only.
    with contextlib.redirect_stdout(io.StringIO()):
        db = load_or_build_vector_store()
        chain, retriever = setup_qa_chain(db)
        answer = chain.invoke(message)
        docs = retriever.invoke(message)

    sources = list(dict.fromkeys(doc.metadata.get("source", "") for doc in docs))
    return {"answer": answer, "sources": [source for source in sources if source]}


def main():

    # 1-3. Load the saved vector store (scraping and building it if needed)
    db = load_or_build_vector_store()

    # 4. Set up QA chain
    print("Setting up QA chain...")
    qa_chain = setup_qa_chain(db)

    # 5. Interactive query loop
    print("\nReady for questions! (Type 'quit' to exit)")
    while True:
        query = input("\nEnter your question: ").strip()

        if not query:
            continue

        if query.lower() == "quit":
            break

        result = process_query(qa_chain, query)

        print("\nResponse:")
        print(result["answer"])

        if result["sources"]:
            print("\nSources:")
            for source in result["sources"].split(","):
                print("- " + source.strip())


if __name__ == "__main__":
    # A JSON payload passed as the first argument means the website is
    # driving this (one question in, one answer out); otherwise run the
    # interactive terminal chat.
    if len(sys.argv) > 1:
        try:
            print(json.dumps(run_message(json.loads(sys.argv[1]))))
        except Exception as e:
            print(json.dumps({"error": str(e)}), file=sys.stderr)
            sys.exit(1)
    else:
        main()