from importlib import import_module


try:
    PyPDFLoader = import_module(
        "langchain_community.document_loaders"
    ).PyPDFLoader
except ModuleNotFoundError as exc:
    raise ModuleNotFoundError(
        "Install the PDF loader dependencies with: "
        "python -m pip install -U langchain-community pypdf"
    ) from exc

pdf_loader = PyPDFLoader("./doc/linux-manual.pdf")

docs = pdf_loader.load()
print("PDF Documents:", docs)