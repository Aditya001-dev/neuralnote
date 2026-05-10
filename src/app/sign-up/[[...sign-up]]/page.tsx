import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
      <div className="flex flex-col items-center gap-6">
        <div className="text-center">
          <p className="text-xs text-[#00e5a0] font-medium tracking-widest uppercase mb-2">AI / LLM / RAG</p>
          <h1 className="text-4xl font-bold text-white" style={{ fontFamily: 'Syne, system-ui' }}>NeuralNote</h1>
          <p className="text-sm text-[#6666aa] mt-2">Your documents, made intelligent.</p>
        </div>
        <SignUp appearance={{
          variables: {
            colorPrimary: '#00e5a0',
            colorBackground: '#16161f',
            colorText: '#e8e8f0',
            colorTextSecondary: '#8888aa',
            colorInputBackground: '#0a0a0f',
            colorInputText: '#e8e8f0',
            borderRadius: '12px',
          },
          elements: {
            card: 'border border-[#1e1e2e] shadow-2xl',
          }
        }} />
      </div>
    </div>
  );
}
