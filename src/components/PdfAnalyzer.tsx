'use client';

import { useEffect, useRef, useState } from 'react';

const ENDPOINT = '/api/pdf-analyzer';
const MAX_PDF_BYTES = 25 * 1024 * 1024;

const LLM_OPTIONS = [
  { value: 'openai', label: 'GPT-4', needsOllama: false },
  { value: 'ollama', label: 'Llama3', needsOllama: true },
];

const EMBEDDING_OPTIONS = [
  { value: 'openai', label: 'OpenAI Embeddings', dimensions: 1536, needsOllama: false },
  { value: 'chroma', label: 'Chroma Default', dimensions: 384, needsOllama: false },
  { value: 'nomic', label: 'Nomic Embed Text', dimensions: 768, needsOllama: true },
];

const BANNER_STYLES = {
  info: 'bg-blue-50 border-blue-200 text-blue-900',
  success: 'bg-green-50 border-green-200 text-green-900',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
  error: 'bg-red-50 border-red-200 text-red-900',
};

function Banner({
  tone,
  children,
}: {
  tone: keyof typeof BANNER_STYLES;
  children: React.ReactNode;
}) {
  return (
    <div className={`px-4 py-3 rounded-lg border text-sm whitespace-pre-wrap ${BANNER_STYLES[tone]}`}>
      {children}
    </div>
  );
}

// Each visitor gets their own collection on the server, keyed by this id.
function makeSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function PdfAnalyzer() {
  const [sessionId] = useState(makeSessionId);
  const [ollamaAvailable, setOllamaAvailable] = useState(false);
  const [llmType, setLlmType] = useState('openai');
  const [embeddingType, setEmbeddingType] = useState('openai');
  const [embeddingChanged, setEmbeddingChanged] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processedFiles, setProcessedFiles] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState('');
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState('');
  const [passages, setPassages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ollama options only appear when the server can reach a local Ollama.
  useEffect(() => {
    fetch(ENDPOINT)
      .then((res) => res.json())
      .then((data) => setOllamaAvailable(Boolean(data.ollamaAvailable)))
      .catch(() => setOllamaAvailable(false));
  }, []);

  const llmOptions = LLM_OPTIONS.filter((option) => ollamaAvailable || !option.needsOllama);
  const embeddingOptions = EMBEDDING_OPTIONS.filter(
    (option) => ollamaAvailable || !option.needsOllama
  );
  const currentEmbedding =
    EMBEDDING_OPTIONS.find((option) => option.value === embeddingType) ?? EMBEDDING_OPTIONS[0];

  const processFile = async (file: File, embedding: string) => {
    setProcessing(true);
    setError('');
    setSuccess('');

    try {
      const form = new FormData();
      form.append('file', file);
      form.append('sessionId', sessionId);
      form.append('embeddingType', embedding);

      const res = await fetch(ENDPOINT, { method: 'POST', body: form });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to process the PDF');
      }

      setProcessedFiles((prev) => [...prev, file.name]);
      setSuccess(`Successfully processed ${file.name}`);
    } catch (err) {
      setError(`Error processing PDF: ${err instanceof Error ? err.message : 'unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are supported.');
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setError('PDF is too large (25 MB max).');
      return;
    }

    setSelectedFile(file);
    setError('');
    if (!processedFiles.includes(file.name)) {
      void processFile(file, embeddingType);
    }
  };

  const handleEmbeddingChange = (value: string) => {
    if (value === embeddingType) return;

    setEmbeddingType(value);
    setEmbeddingChanged(true);
    setProcessedFiles([]);
    setSuccess('');
    setAnswer('');
    setPassages([]);

    // Like the Streamlit app, a file still in the uploader is re-processed
    // with the newly selected embedding model.
    if (selectedFile) {
      void processFile(selectedFile, value);
    }
  };

  const handleAsk = async () => {
    if (!query.trim() || asking) return;

    setAsking(true);
    setError('');

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, sessionId, llmType, embeddingType }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate a response');
      }

      setAnswer(data.answer ?? '');
      setPassages(data.passages ?? []);
    } catch (err) {
      setError(`Error generating response: ${err instanceof Error ? err.message : 'unknown error'}`);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Sidebar */}
      <aside className="md:w-64 md:flex-shrink-0 bg-white border border-slate-200 rounded-lg p-4 space-y-5 self-start">
        <h3 className="text-lg font-bold text-dark-blue">📚 Model Selection</h3>

        <fieldset>
          <legend className="text-sm text-slate-600 mb-2">Choose LLM Model:</legend>
          <div className="space-y-2">
            {llmOptions.map((option) => (
              <label key={option.value} className="flex items-center gap-2 text-sm text-dark-blue">
                <input
                  type="radio"
                  name="pdf-llm"
                  value={option.value}
                  checked={llmType === option.value}
                  onChange={() => setLlmType(option.value)}
                  className="accent-powder-600"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm text-slate-600 mb-2">Choose Embedding Model:</legend>
          <div className="space-y-2">
            {embeddingOptions.map((option) => (
              <label key={option.value} className="flex items-center gap-2 text-sm text-dark-blue">
                <input
                  type="radio"
                  name="pdf-embedding"
                  value={option.value}
                  checked={embeddingType === option.value}
                  onChange={() => handleEmbeddingChange(option.value)}
                  disabled={processing}
                  className="accent-powder-600"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <Banner tone="info">
          {`Current Embedding Model:\n- Name: ${currentEmbedding.label}\n- Dimensions: ${currentEmbedding.dimensions}`}
        </Banner>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 space-y-4">
        <h3 className="text-3xl font-bold text-dark-blue">🤖 Simple RAG System</h3>

        {embeddingChanged && (
          <Banner tone="warning">Embedding model changed. Please re-upload your documents.</Banner>
        )}

        {/* File upload */}
        <div>
          <label className="block text-sm text-slate-600 mb-2">Upload PDF</label>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFile(e.dataTransfer.files?.[0]);
            }}
            className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-4 rounded-lg border-2 border-dashed transition-colors ${
              dragging ? 'border-powder-500 bg-powder-50' : 'border-slate-300 bg-white'
            }`}
          >
            <div className="text-sm text-slate-600 text-center sm:text-left">
              <p className="font-medium text-dark-blue">Drag and drop file here</p>
              <p>Limit 25MB per file • PDF</p>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={processing}
              className="px-4 py-2 text-sm font-semibold bg-white border border-slate-300 rounded-lg text-dark-blue hover:border-powder-600 hover:text-powder-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Browse files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                handleFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>

          {selectedFile && (
            <div className="mt-2 flex items-center justify-between px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-dark-blue">
              <span className="truncate">
                📄 {selectedFile.name}{' '}
                <span className="text-slate-500">{formatSize(selectedFile.size)}</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                disabled={processing}
                aria-label="Remove file"
                className="ml-3 text-slate-500 hover:text-red-600 disabled:opacity-50"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {processing && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="w-4 h-4 border-2 border-powder-500 border-t-transparent rounded-full animate-spin"></span>
            Processing PDF...
          </div>
        )}
        {success && <Banner tone="success">{success}</Banner>}
        {error && <Banner tone="error">{error}</Banner>}

        {/* Query interface */}
        {processedFiles.length > 0 ? (
          <div className="space-y-4">
            <hr className="border-slate-200" />
            <h4 className="text-xl font-bold text-dark-blue">🔍 Query Your Documents</h4>

            <div>
              <label htmlFor="pdf-query" className="block text-sm text-slate-600 mb-2">
                Ask a question:
              </label>
              <input
                id="pdf-query"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleAsk();
                }}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors"
              />
              <p className="mt-1 text-xs text-slate-500">Press Enter to apply</p>
            </div>

            {asking && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span className="w-4 h-4 border-2 border-powder-500 border-t-transparent rounded-full animate-spin"></span>
                Generating response...
              </div>
            )}

            {answer && !asking && (
              <div className="space-y-4">
                <div>
                  <h5 className="text-lg font-bold text-dark-blue mb-2">📝 Answer:</h5>
                  <p className="text-dark-blue whitespace-pre-wrap leading-relaxed">{answer}</p>
                </div>

                <details className="bg-white border border-slate-200 rounded-lg">
                  <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-dark-blue">
                    View Source Passages
                  </summary>
                  <div className="px-4 pb-4 space-y-3">
                    {passages.map((passage, index) => (
                      <div key={index}>
                        <p className="text-sm font-bold text-dark-blue mb-1">Passage {index + 1}:</p>
                        <Banner tone="info">{passage}</Banner>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </div>
        ) : (
          !processing && <Banner tone="info">👆 Please upload a PDF document to get started!</Banner>
        )}
      </div>
    </div>
  );
}
