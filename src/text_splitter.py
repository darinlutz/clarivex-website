from pathlib import Path

from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

# The file is UTF-8, but TextLoader falls back to Windows' cp1252 by default,
# which can't decode some of its bytes. The path is resolved relative to the
# project root so it works from any working directory.
WHITEPAPER_PATH = Path(__file__).resolve().parent.parent / "data" / "Bitcoin_whitepaper.txt"
text_loader = TextLoader(str(WHITEPAPER_PATH), encoding="utf-8")
documents = text_loader.load()  # Load documents


# Create text splitter
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=100,
    chunk_overlap=20,
    length_function=len,
)


# Split documents
splits = text_splitter.split_documents(documents)
# Output the results
for i, split in enumerate(splits):
    print(f"Split {i+1}:\n{split}\n")