from importlib import import_module


# Load the community package dynamically so static analysis does not fail when
# the optional LangChain integration is not installed in the active environment.
_document_loaders = import_module("langchain_community.document_loaders")
TextLoader = _document_loaders.TextLoader
PyPDFLoader = _document_loaders.PyPDFLoader
CSVLoader = _document_loaders.CSVLoader
DirectoryLoader = _document_loaders.DirectoryLoader

# from langchain_community.document_loaders import DirectoryLoader, TextLoader
dir_loader = DirectoryLoader("./data/", glob="**/*.txt")
dir_documents = dir_loader.load()

print("Directory Text Documents:", dir_documents)