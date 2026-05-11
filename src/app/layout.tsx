import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NeuralNote — AI-Powered Knowledge Base',
  description: 'Upload any document and turn it into a queryable knowledge base with RAG pipelines, semantic search, and LLM-assisted summarization.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="noise">
        {children}
      </body>
    </html>
  );
}