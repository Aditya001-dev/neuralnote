import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export const metadata: Metadata = {
  title: 'NeuralNote — AI-Powered Knowledge Base',
  description: 'Upload any document and turn it into a queryable knowledge base with RAG pipelines, semantic search, and LLM-assisted summarization.',
  keywords: ['AI notes', 'RAG', 'semantic search', 'LangChain', 'Pinecone', 'knowledge base'],
  openGraph: {
    title: 'NeuralNote',
    description: 'Your documents, made intelligent.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider dynamic>
      <html lang="en" className="dark">
        <body className="noise">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}