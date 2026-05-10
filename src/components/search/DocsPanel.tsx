'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNeuralNoteStore, Document } from '@/lib/store';
import { formatFileSize, timeAgo } from '@/lib/ai';
import { Upload, Trash2, CheckCircle, Loader2, AlertCircle, FileText, X, Hash } from 'lucide-react';

export default function DocsPanel() {
  const { documents, addDocument, updateDocument, deleteDocument } = useNeuralNoteStore();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        const tempId = `uploading-${Date.now()}`;
        const tempDoc: Document = {
          id: tempId,
          name: file.name,
          type: file.type,
          size: file.size,
          uploadedAt: Date.now(),
          chunkCount: 0,
          status: 'processing',
        };
        addDocument(tempDoc);
        setUploading(true);
        setUploadError('');

        try {
          const formData = new FormData();
          formData.append('file', file);

          const res = await fetch('/api/upload', { method: 'POST', body: formData });
          const data = await res.json();

          if (!res.ok) throw new Error(data.error || 'Upload failed');

          updateDocument(tempId, {
            id: data.id,
            chunkCount: data.chunkCount,
            status: 'ready',
            summary: data.summary,
            topics: data.topics,
          });
        } catch (e: unknown) {
          updateDocument(tempId, { status: 'error' });
          setUploadError(e instanceof Error ? e.message : 'Upload failed');
        } finally {
          setUploading(false);
        }
      }
    },
    [addDocument, updateDocument]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
    maxSize: 20 * 1024 * 1024,
    disabled: uploading,
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-nn-border flex-shrink-0">
        <h2 className="text-sm font-medium text-nn-text mb-1">Document Knowledge Base</h2>
        <p className="text-xs text-nn-muted">
          Upload PDFs, Word docs, or text files. They get chunked, embedded, and indexed for semantic search and RAG.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={`relative mb-6 border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            isDragActive
              ? 'border-[#00e5a0] bg-[#00e5a008]'
              : 'border-nn-border hover:border-[#00e5a040] hover:bg-[#00e5a005]'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${
              isDragActive ? 'bg-[#00e5a020] border-[#00e5a040]' : 'bg-nn-card border-nn-border'
            }`}>
              {uploading
                ? <Loader2 size={20} className="text-[#00e5a0] animate-spin" />
                : <Upload size={20} className={isDragActive ? 'text-[#00e5a0]' : 'text-nn-muted'} />
              }
            </div>
            <div>
              <p className="text-sm font-medium text-nn-text">
                {isDragActive ? 'Drop to upload' : uploading ? 'Processing...' : 'Drop files here'}
              </p>
              <p className="text-xs text-nn-muted mt-0.5">PDF, DOCX, TXT, MD · max 20MB</p>
            </div>
            {!uploading && (
              <span className="text-xs text-[#00e5a0] px-3 py-1 rounded-full border border-[#00e5a030] bg-[#00e5a010]">
                Browse files
              </span>
            )}
          </div>
        </div>

        {/* Pipeline info */}
        <div className="bg-nn-card border border-nn-border rounded-xl p-4 mb-6">
          <p className="text-xs font-medium text-nn-text mb-3">RAG Pipeline</p>
          <div className="flex items-center gap-0">
            {[
              { label: 'Upload', desc: 'PDF/DOCX/TXT' },
              { label: 'Extract', desc: 'Raw text' },
              { label: 'Chunk', desc: '800 tokens' },
              { label: 'Embed', desc: 'OpenAI 1536d' },
              { label: 'Index', desc: 'Pinecone' },
            ].map((step, i, arr) => (
              <div key={step.label} className="flex items-center">
                <div className="text-center">
                  <div className="w-8 h-8 rounded-lg bg-[#00e5a015] border border-[#00e5a030] flex items-center justify-center mx-auto mb-1">
                    <span className="text-[9px] font-bold text-[#00e5a0]">{i + 1}</span>
                  </div>
                  <p className="text-[9px] font-medium text-nn-text">{step.label}</p>
                  <p className="text-[8px] text-nn-muted">{step.desc}</p>
                </div>
                {i < arr.length - 1 && <div className="w-6 h-px bg-[#00e5a030] mx-1 mb-4" />}
              </div>
            ))}
          </div>
        </div>

        {uploadError && (
          <div className="flex items-start gap-2 bg-red-950/30 border border-red-900/50 rounded-xl p-3 mb-4">
            <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-red-300">{uploadError}</p>
              <p className="text-[10px] text-red-400 mt-0.5">Make sure OPENAI_API_KEY is set in .env.local</p>
            </div>
            <button onClick={() => setUploadError('')} className="ml-auto text-red-400 hover:text-red-300">
              <X size={12} />
            </button>
          </div>
        )}

        {/* Documents list */}
        {documents.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-nn-muted">
            <FileText size={32} className="opacity-20" />
            <p className="text-sm">No documents uploaded yet</p>
            <p className="text-xs text-center">Upload your study materials, research papers, or textbooks to enable RAG search</p>
          </div>
        ) : (
          <div>
            <p className="text-xs text-nn-muted uppercase tracking-widest font-medium mb-3">
              {documents.length} document{documents.length !== 1 ? 's' : ''} indexed
            </p>
            <div className="space-y-3">
              {documents.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} onDelete={() => deleteDocument(doc.id)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentCard({ doc, onDelete }: { doc: Document; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-nn-card rounded-xl border border-nn-border group overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
          doc.status === 'ready' ? 'bg-[#00e5a015] border border-[#00e5a030]' :
          doc.status === 'error' ? 'bg-red-950/30 border border-red-900/50' :
          'bg-nn-surface border border-nn-border'
        }`}>
          {doc.status === 'ready' && <CheckCircle size={15} className="text-[#00e5a0]" />}
          {doc.status === 'processing' && <Loader2 size={15} className="text-nn-muted animate-spin" />}
          {doc.status === 'error' && <AlertCircle size={15} className="text-red-400" />}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-nn-text truncate">{doc.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-nn-muted">{formatFileSize(doc.size)}</span>
            {doc.chunkCount > 0 && (
              <>
                <span className="text-nn-border">·</span>
                <span className="text-[10px] text-[#00e5a080]">{doc.chunkCount} chunks</span>
              </>
            )}
            <span className="text-nn-border">·</span>
            <span className="text-[10px] text-nn-muted">{timeAgo(doc.uploadedAt)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {doc.status === 'ready' && doc.summary && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[9px] px-2 py-0.5 rounded-full bg-[#00e5a015] text-[#00e5a0] border border-[#00e5a025] hover:bg-[#00e5a020] transition-all"
            >
              {expanded ? 'Hide' : 'Summary'}
            </button>
          )}
          {doc.status === 'processing' && (
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-900/20 text-amber-400 border border-amber-900/30">
              Indexing
            </span>
          )}
          <button
            onClick={onDelete}
            className="w-6 h-6 flex items-center justify-center rounded-md text-nn-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* Expandable summary */}
      {expanded && doc.summary && (
        <div className="px-4 pb-3 border-t border-nn-border pt-3 animate-fade-in">
          <p className="text-xs text-nn-muted leading-relaxed mb-2">{doc.summary}</p>
          {doc.topics && doc.topics.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {doc.topics.map((t) => (
                <span key={t} className="text-[9px] flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#00e5a010] text-[#00e5a080] border border-[#00e5a020]">
                  <Hash size={7} />{t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
