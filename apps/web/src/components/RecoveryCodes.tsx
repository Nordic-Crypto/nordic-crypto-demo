import { useState } from 'react';

export function RecoveryCodes({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(codes.join('\n'));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="codes">
      <ol className="codes__list">
        {codes.map((c) => (
          <li key={c}>
            <code>{c}</code>
          </li>
        ))}
      </ol>
      <button type="button" className="btn btn--ghost" onClick={() => void copy()}>
        {copied ? 'Copied ✓' : 'Copy codes'}
      </button>
    </div>
  );
}
