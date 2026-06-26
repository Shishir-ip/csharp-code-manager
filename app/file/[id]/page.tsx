'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Play, X, Terminal, ArrowLeft, Zap, MousePointerClick, Check } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';

type FileData = {
  id: string;
  name: string;
  topic: string | null;
  content: string;
  folder_id: string | null;
  simulation_output: string | null;
  simulation_input: string | null;
};

export default function FilePage() {
  const { id } = useParams();
  const [file, setFile] = useState<FileData | null>(null);
  const [running, setRunning] = useState(false);
  const [showTerm, setShowTerm] = useState(false);
  const [output, setOutput] = useState('');
  const [stdin, setStdin] = useState('');
  const [needsInput, setNeedsInput] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<'simulation' | 'real'>('simulation');

  useEffect(() => {
    if (id) {
      supabase.from('files').select('*').eq('id', id).single().then(({ data }) => {
        if (data) {
          setFile(data);
          setNeedsInput(data.content?.includes('Console.ReadLine') || false);
          if (data.simulation_output) {
            setMode('simulation');
          } else {
            setMode('real');
          }
        }
      });
    }
  }, [id]);

  const handleCopy = () => {
    if (file?.content) {
      navigator.clipboard.writeText(file.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const runSimulation = () => {
    if (!file?.simulation_output) return;
    setShowTerm(true);
    setOutput('');
    const fullOutput = file.simulation_output;
    let current = `> Initializing simulation...
> Running C# program...

`;
    setOutput(current);
    let i = 0;
    const interval = setInterval(() => {
      if (i < fullOutput.length) {
        current += fullOutput[i];
        setOutput(current);
        i++;
      } else {
        clearInterval(interval);
        setOutput(current + `

> Simulation complete.`);
      }
    }, 3);
  };

  const handleRealRun = async () => {
    if (!file) return;
    setRunning(true);
    setShowTerm(true);
    setOutput(`> Compiling C# code...
> Using .NET 9 compiler...
`);

    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: file.content, stdin }),
      });
      const data = await res.json();

      let result = '';
      if (data.error) {
        result = `
[ERROR] ${data.error}`;
      } else {
        if (data.output) result += data.output;
        if (data.error && !data.output) result += `
[ERROR]
${data.error}`;
        if (!data.output && !data.error) result = '> Execution finished with no output.';
      }
      setOutput(prev => prev + result);
    } catch (e) {
      setOutput(`> Failed to execute code.
> Tip: Switch to Simulation Mode if API is unavailable.`);
    } finally {
      setRunning(false);
    }
  };

  const handleRun = () => {
    if (mode === 'simulation') {
      runSimulation();
    } else {
      handleRealRun();
    }
  };

  if (!file) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-dark-400 text-sm">Loading file...</p>
        </div>
      </div>
    );
  }

  const hasSimulation = !!file.simulation_output;

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-40 glass border-b border-dark-500/50"
      >
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href={file.folder_id ? `/folder/${file.folder_id}` : '/'}>
              <button className="p-2 hover:bg-dark-700/50 rounded-lg transition-colors flex-shrink-0">
                <ArrowLeft size={18} className="text-dark-300" />
              </button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white truncate">{file.topic || file.name}</h1>
              <p className="text-xs text-dark-400 truncate">{file.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-700 hover:bg-dark-600 border border-dark-500/50 text-xs font-medium transition-all"
            >
              {copied ? <Check size={14} className="text-accent-green" /> : <Copy size={14} className="text-dark-300" />}
              <span className={copied ? 'text-accent-green' : 'text-dark-200'}>
                {copied ? 'Copied' : 'Copy'}
              </span>
            </button>

            {hasSimulation && (
              <div className="hidden sm:flex rounded-lg border border-dark-500/50 overflow-hidden">
                <button
                  onClick={() => setMode('simulation')}
                  className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    mode === 'simulation' ? 'bg-purple-500/20 text-purple-400' : 'bg-dark-700 text-dark-400 hover:text-dark-200'
                  }`}
                >
                  <MousePointerClick size={12} /> Simulate
                </button>
                <button
                  onClick={() => setMode('real')}
                  className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors border-l border-dark-500/50 ${
                    mode === 'real' ? 'bg-blue-500/20 text-accent-blue' : 'bg-dark-700 text-dark-400 hover:text-dark-200'
                  }`}
                >
                  <Zap size={12} /> Real Run
                </button>
              </div>
            )}

            <button
              onClick={handleRun}
              disabled={running}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-accent-blue hover:bg-blue-500 disabled:bg-blue-500/30 text-white text-xs font-medium transition-all shadow-lg shadow-blue-500/20"
            >
              <Play size={14} />
              {running ? 'Running...' : mode === 'simulation' ? 'Run Sim' : 'Build & Run'}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Code Editor */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl overflow-hidden border border-dark-500/50 bg-dark-800 shadow-2xl"
        >
          {/* Editor Title Bar */}
          <div className="bg-dark-700 px-4 py-2.5 flex items-center gap-3 border-b border-dark-500/30">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-accent-red/80" />
              <div className="w-3 h-3 rounded-full bg-accent-orange/80" />
              <div className="w-3 h-3 rounded-full bg-accent-green/80" />
            </div>
            <span className="text-xs text-dark-300 font-mono">{file.name}</span>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
              <span className="text-[10px] text-dark-400">C#</span>
            </div>
          </div>

          <SyntaxHighlighter
            language="csharp"
            style={vscDarkPlus}
            showLineNumbers
            customStyle={{
              margin: 0,
              padding: '1.5rem',
              fontSize: '13px',
              lineHeight: '1.7',
              background: '#0d1117',
              fontFamily: "'JetBrains Mono', monospace",
            }}
            lineNumberStyle={{
              color: '#484f58',
              paddingRight: '1.5rem',
              fontSize: '12px',
            }}
          >
            {file.content}
          </SyntaxHighlighter>
        </motion.div>

        {hasSimulation && mode === 'simulation' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-xl bg-purple-500/5 border border-purple-500/20"
          >
            <div className="flex items-start gap-3">
              <MousePointerClick size={18} className="text-purple-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-purple-300">Simulation Mode Active</p>
                <p className="text-xs text-purple-400/70 mt-1">
                  This file has a pre-defined output. No external API needed — runs instantly.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Terminal Modal */}
      <AnimatePresence>
        {showTerm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowTerm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-dark-800 border border-dark-500/50 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              {/* Terminal Header */}
              <div className="bg-dark-700 px-4 py-3 flex items-center justify-between border-b border-dark-500/30">
                <div className="flex items-center gap-2">
                  <Terminal size={15} className="text-accent-green" />
                  <span className="text-xs font-semibold text-dark-200">
                    {mode === 'simulation' ? 'Simulation Output' : 'Output Terminal'}
                  </span>
                  {mode === 'simulation' && (
                    <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full font-medium">
                      SIMULATION
                    </span>
                  )}
                </div>
                <button onClick={() => setShowTerm(false)} className="text-dark-400 hover:text-white transition-colors p-1">
                  <X size={16} />
                </button>
              </div>

              {/* Input Area */}
              {mode === 'real' && needsInput && (
                <div className="px-4 py-3 border-b border-dark-500/30 bg-dark-700/30">
                  <p className="text-dark-400 text-xs mb-2">Program requires input (one value per line):</p>
                  <textarea
                    value={stdin}
                    onChange={(e) => setStdin(e.target.value)}
                    className="w-full bg-dark-900 border border-dark-500/50 rounded-lg px-3 py-2 text-dark-100 text-xs font-mono focus:outline-none focus:border-accent-blue resize-none"
                    placeholder="Enter inputs here..."
                    rows={3}
                  />
                </div>
              )}

              {/* Terminal Output */}
              <div className="p-4 bg-black min-h-[220px] max-h-[420px] overflow-auto font-mono text-sm">
                <pre className="text-green-400 whitespace-pre-wrap leading-relaxed">
                  {output}
                  {running && <span className="terminal-cursor">_</span>}
                </pre>
              </div>

              {/* Terminal Footer */}
              <div className="bg-dark-700 px-4 py-2.5 border-t border-dark-500/30 flex justify-between items-center">
                <span className="text-[10px] text-dark-400">
                  {mode === 'simulation' ? 'Pre-defined output' : 'Powered by OnlineCompiler.io'}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setOutput(''); setStdin(''); }}
                    className="px-3 py-1.5 text-[11px] rounded bg-dark-600 hover:bg-dark-500 text-dark-300 transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleRun}
                    disabled={running}
                    className="px-3 py-1.5 text-[11px] rounded bg-accent-green/20 hover:bg-accent-green/30 text-accent-green transition-colors font-medium"
                  >
                    {running ? 'Running...' : 'Run Again'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


