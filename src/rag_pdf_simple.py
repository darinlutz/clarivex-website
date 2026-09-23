import contextlib
import io
import json
import os
import re
import sys
import time
import uuid
from pathlib import Path

import chromadb
import PyPDF2
from chromadb.utils import embedding_functions
from dotenv import load_dotenv
from openai import OpenAI

# load_dotenv() with no arguments only looks for a file literally named
# ".env", but this project keeps its keys (OPENAI_API_KEY, etc.) in
# ".env.local" at the project root. Point at it explicitly, and resolve the
# path relative to this file so it works no matter what directory the
# script is run from.
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env.local")

# Constants
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
CHROMA_PATH = str(Path(__file__).resolve().parent.parent / "chroma_db")

# Per-visitor collections created by the website are cleaned up after this.
MAX_COLLECTION_AGE_SECONDS = 24 * 60 * 60


class SimpleModelSelector:
    """Simple class to handle model selection"""

    def __init__(self):
        # Available LLM models
        self.llm_models = {"openai": "GPT-4", "ollama": "Llama3"}

        # Available embedding models with their dimensions
        self.embedding_models = {
            "openai": {
                "name": "OpenAI Embeddings",
                "dimensions": 1536,
                "model_name": "text-embedding-3-small",
            },
            "chroma": {"name": "Chroma Default", "dimensions": 384, "model_name": None},
            "nomic": {
                "name": "Nomic Embed Text",
                "dimensions": 768,
                "model_name": "nomic-embed-text",
            },
        }

    def select_models(self):
        """Let user select models through Streamlit UI"""
        import streamlit as st

        st.sidebar.title("📚 Model Selection")

        # Select LLM
        llm = st.sidebar.radio(
            "Choose LLM Model:",
            options=list(self.llm_models.keys()),
            format_func=lambda x: self.llm_models[x],
        )

        # Select Embeddings
        embedding = st.sidebar.radio(
            "Choose Embedding Model:",
            options=list(self.embedding_models.keys()),
            format_func=lambda x: self.embedding_models[x]["name"],
        )

        return llm, embedding


class SimplePDFProcessor:
    """Handle PDF processing and chunking"""

    def __init__(self, chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def read_pdf(self, pdf_file):
        """Read PDF and extract text"""
        reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            text += (page.extract_text() or "") + "\n"
        return text

    def create_chunks(self, text, filename):
        """Split text into chunks"""
        chunks = []
        start = 0

        while start < len(text):
            # Find end of chunk
            end = start + self.chunk_size

            # If not at the start, include overlap
            if start > 0:
                start = start - self.chunk_overlap

            # Get chunk
            chunk = text[start:end]

            # Try to break at sentence end. Only break beyond the overlap
            # region: a period inside it would move `end` back to (or before)
            # where the previous chunk ended and the loop would never advance.
            if end < len(text):
                last_period = chunk.rfind(".")
                if last_period > self.chunk_overlap:
                    chunk = chunk[: last_period + 1]
                    end = start + last_period + 1

            if chunk.strip():
                chunks.append(
                    {
                        "id": str(uuid.uuid4()),
                        "text": chunk,
                        "metadata": {"source": filename},
                    }
                )

            start = end

        return chunks


class SimpleRAGSystem:
    """Simple RAG implementation"""

    def __init__(self, embedding_model="openai", llm_model="openai", session_id=None):
        self.embedding_model = embedding_model
        self.llm_model = llm_model
        # The website gives each visitor their own collection so uploaded
        # documents aren't shared between people.
        self.session_id = session_id

        # Initialize ChromaDB
        self.db = chromadb.PersistentClient(path=CHROMA_PATH)

        # Setup embedding function based on model
        self.setup_embedding_function()

        # Setup LLM
        if llm_model == "openai":
            self.llm = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        else:
            self.llm = OpenAI(base_url="http://localhost:11434/v1", api_key="ollama")

        # Get or create collection with proper handling
        self.collection = self.setup_collection()

    def setup_embedding_function(self):
        """Setup the appropriate embedding function"""
        if self.embedding_model == "openai":
            self.embedding_fn = embedding_functions.OpenAIEmbeddingFunction(
                api_key=os.getenv("OPENAI_API_KEY"),
                model_name="text-embedding-3-small",
            )
        elif self.embedding_model == "nomic":
            # For Nomic embeddings via Ollama
            self.embedding_fn = embedding_functions.OpenAIEmbeddingFunction(
                api_key="ollama",
                api_base="http://localhost:11434/v1",
                model_name="nomic-embed-text",
            )
        else:  # chroma default
            self.embedding_fn = embedding_functions.DefaultEmbeddingFunction()

    def setup_collection(self):
        """Setup collection with proper dimension handling"""
        collection_name = f"documents_{self.embedding_model}"
        if self.session_id:
            collection_name += f"_{self.session_id}"

        # Try to get existing collection first
        try:
            return self.db.get_collection(
                name=collection_name, embedding_function=self.embedding_fn
            )
        except Exception:
            # If collection doesn't exist, create new one
            return self.db.create_collection(
                name=collection_name,
                embedding_function=self.embedding_fn,
                metadata={"model": self.embedding_model, "created_at": time.time()},
            )

    def add_documents(self, chunks):
        """Add documents to ChromaDB"""
        # Re-uploading a file replaces its earlier chunks instead of
        # duplicating them (duplicates would crowd out other passages).
        sources = {chunk["metadata"]["source"] for chunk in chunks}
        for source in sources:
            self.collection.delete(where={"source": source})

        batch_size = 100
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i : i + batch_size]
            self.collection.add(
                ids=[chunk["id"] for chunk in batch],
                documents=[chunk["text"] for chunk in batch],
                metadatas=[chunk["metadata"] for chunk in batch],
            )

    def query_documents(self, query, n_results=3):
        """Query documents and return relevant chunks"""
        return self.collection.query(query_texts=[query], n_results=n_results)

    def generate_response(self, query, context):
        """Generate response using LLM"""
        prompt = f"""
        Based on the following context, please answer the question.
        If you can't find the answer in the context, say so, or I don't know.

        Context: {context}

        Question: {query}

        Answer:
        """

        response = self.llm.chat.completions.create(
            model="gpt-4o-mini" if self.llm_model == "openai" else "llama3.2",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt},
            ],
        )

        return response.choices[0].message.content

    def get_embedding_info(self):
        """Get information about current embedding model"""
        model_selector = SimpleModelSelector()
        model_info = model_selector.embedding_models[self.embedding_model]
        return {
            "name": model_info["name"],
            "dimensions": model_info["dimensions"],
            "model": self.embedding_model,
        }

    def remove_stale_collections(self):
        """Drop per-visitor collections from the website older than a day."""
        cutoff = time.time() - MAX_COLLECTION_AGE_SECONDS
        for collection in self.db.list_collections():
            created_at = (collection.metadata or {}).get("created_at")
            if collection.name.startswith("documents_") and created_at and created_at < cutoff:
                self.db.delete_collection(collection.name)


def run_pdf_action(payload: dict) -> dict:
    """Handle one request from the website (one process per call, so the
    persistent ChromaDB store is what carries a visitor's uploaded PDFs from
    the "process" call to later "query" calls)."""
    action = payload.get("action")
    embedding_type = payload.get("embeddingType", "openai")
    llm_type = payload.get("llmType", "openai")
    session_id = re.sub(r"[^A-Za-z0-9]", "", payload.get("sessionId") or "")[:32]
    if not session_id:
        raise ValueError("Missing session id")

    # The classes print nothing, but chromadb/openai can be chatty; keep
    # stdout for the JSON result only.
    with contextlib.redirect_stdout(io.StringIO()):
        rag = SimpleRAGSystem(embedding_type, llm_type, session_id)
        embedding_info = rag.get_embedding_info()

        if action == "process":
            filename = payload.get("filename") or Path(payload["pdfPath"]).name
            processor = SimplePDFProcessor()
            text = processor.read_pdf(payload["pdfPath"])
            if not text.strip():
                raise ValueError(
                    "No text could be extracted from this PDF (it may be scanned images)."
                )
            chunks = processor.create_chunks(text, filename)
            rag.add_documents(chunks)
            rag.remove_stale_collections()
            return {
                "filename": filename,
                "chunkCount": len(chunks),
                "embedding": embedding_info,
            }

        if action == "query":
            query = payload.get("query", "")
            if rag.collection.count() == 0:
                raise ValueError("No documents found. Please upload a PDF first.")
            results = rag.query_documents(query)
            passages = results["documents"][0]
            answer = rag.generate_response(query, "\n\n".join(passages))
            return {"answer": answer, "passages": passages, "embedding": embedding_info}

    raise ValueError(f"Unknown action: {action}")


def main():
    import streamlit as st

    st.title("🤖 Simple RAG System")

    # Initialize session state
    if "processed_files" not in st.session_state:
        st.session_state.processed_files = set()
    if "current_embedding_model" not in st.session_state:
        st.session_state.current_embedding_model = None
    if "rag_system" not in st.session_state:
        st.session_state.rag_system = None

    # Initialize model selector
    model_selector = SimpleModelSelector()
    llm_model, embedding_model = model_selector.select_models()

    # Check if embedding model changed
    if embedding_model != st.session_state.current_embedding_model:
        st.session_state.processed_files.clear()  # Clear processed files
        st.session_state.current_embedding_model = embedding_model
        st.session_state.rag_system = None  # Reset RAG system
        st.warning("Embedding model changed. Please re-upload your documents.")

    # Initialize RAG system
    try:
        if st.session_state.rag_system is None:
            st.session_state.rag_system = SimpleRAGSystem(embedding_model, llm_model)

        # Display current embedding model info
        embedding_info = st.session_state.rag_system.get_embedding_info()
        st.sidebar.info(
            f"Current Embedding Model:\n"
            f"- Name: {embedding_info['name']}\n"
            f"- Dimensions: {embedding_info['dimensions']}"
        )
    except Exception as e:
        st.error(f"Error initializing RAG system: {str(e)}")
        return

    # File upload
    pdf_file = st.file_uploader("Upload PDF", type="pdf")

    if pdf_file and pdf_file.name not in st.session_state.processed_files:
        # Process PDF
        processor = SimplePDFProcessor()
        with st.spinner("Processing PDF..."):
            try:
                # Extract text
                text = processor.read_pdf(pdf_file)
                # Create chunks
                chunks = processor.create_chunks(text, pdf_file.name)
                # Add to database
                st.session_state.rag_system.add_documents(chunks)
                st.session_state.processed_files.add(pdf_file.name)
                st.success(f"Successfully processed {pdf_file.name}")
            except Exception as e:
                st.error(f"Error processing PDF: {str(e)}")

    # Query interface
    if st.session_state.processed_files:
        st.markdown("---")
        st.subheader("🔍 Query Your Documents")
        query = st.text_input("Ask a question:")

        if query:
            with st.spinner("Generating response..."):
                try:
                    # Get relevant chunks
                    results = st.session_state.rag_system.query_documents(query)
                    if results and results["documents"]:
                        passages = results["documents"][0]
                        # Generate response
                        response = st.session_state.rag_system.generate_response(
                            query, "\n\n".join(passages)
                        )

                        # Display results
                        st.markdown("### 📝 Answer:")
                        st.write(response)

                        with st.expander("View Source Passages"):
                            for idx, doc in enumerate(passages, 1):
                                st.markdown(f"**Passage {idx}:**")
                                st.info(doc)
                except Exception as e:
                    st.error(f"Error generating response: {str(e)}")
    else:
        st.info("👆 Please upload a PDF document to get started!")


if __name__ == "__main__":
    # A JSON payload passed as the first argument means the website is
    # driving this; otherwise run the Streamlit app (`streamlit run`).
    if len(sys.argv) > 1:
        try:
            print(json.dumps(run_pdf_action(json.loads(sys.argv[1]))))
        except Exception as e:
            print(json.dumps({"error": str(e)}), file=sys.stderr)
            sys.exit(1)
    else:
        main()
