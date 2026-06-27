'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Play, X, Terminal, ArrowLeft, Zap, MousePointerClick, Check, Send, Loader2 } from 'lucide-react';
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
};

export default function FilePage() {
  const { id } = useParams();
  const [file, setFile] = useState<FileData | null>(null);
  const [running, setRunning] = useState(false);
  const [showTerm, setShowTerm] = useState(false);
  const [output, setOutput] = useState('');
  const [userInput, setUserInput] = useState('');
  const [isWaitingInput, setIsWaitingInput] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<'simulation' | 'ai'>('simulation');
  const [allInputs, setAllInputs] = useState<string[]>([]);
  const outputRef = useRef<HTMLDivElement>(null);

  // Ref for run cancellation
  const runIdRef = useRef(0);

  useEffect(() => {
    if (id) {
      supabase.from('files').select('*').eq('id', id).single().then(({ data }) => {
        if (data) {
          setFile(data);
          if (data.simulation_output) setMode('simulation');
          else setMode('ai');
        }
      });
    }
  }, [id]);

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [output]);

  const handleCopy = () => {
    if (file?.content) {
      navigator.clipboard.writeText(file.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // SIMULATION MODE
  const runSimulation = () => {
    if (!file?.simulation_output) {
      setShowTerm(true);
      setOutput('> No simulation output defined.');
      return;
    }
    // Cancel any AI run
    runIdRef.current += 1;
    // Clear everything
    setShowTerm(true);
    setOutput('');
    setAllInputs([]);
    setIsWaitingInput(false);
    setRunning(false);

    const fullOutput = file.simulation_output;
    let current = `> Initializing simulation...\n> Running C# program...\n\n`;
    setOutput(current);
    let i = 0;
    const interval = setInterval(() => {
      if (i < fullOutput.length) {
        current += fullOutput[i];
        setOutput(current);
        i++;
      } else {
        clearInterval(interval);
        setOutput(current + `\n\n> Simulation complete.`);
      }
    }, 3);
  };

  // AI MODE — Step by step, one API call per input
  const startAI = async () => {
    if (!file) return;

    // Cancel any previous run
    runIdRef.current += 1;
    const currentRunId = runIdRef.current;

    // Clear everything completely
    setRunning(true);
    setShowTerm(true);
    setOutput('');
    setAllInputs([]);
    setIsWaitingInput(false);
    setUserInput('');

    setOutput(`> Compiling C# code...\n> Using AI Compiler (OpenRouter)...\n\n`);

    // Step 1: Run with no inputs
    await runAIStep([], currentRunId);
  };

  const runAIStep = async (currentInputs: string[], runId: number) => {
    if (runId !== runIdRef.current) return;

    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: file?.content || '',
          inputs: currentInputs,
        }),
      });

      if (runId !== runIdRef.current) return;

      const data = await res.json();

      if (data.error) {
        setOutput(prev => prev + `\n[ERROR] ${data.error}`);
        setRunning(false);
        setIsWaitingInput(false);
        return;
      }

      const aiText = data.output || '';

      // Build the display output: keep system messages, replace AI part
      const systemHeader = `> Compiling C# code...\n> Using AI Compiler (OpenRouter)...\n\n`;
      setOutput(systemHeader + aiText);

      if (data.hasMoreInput) {
        setIsWaitingInput(true);
        setRunning(false);
      } else {
        // Program finished
        setOutput(prev => prev + '\n\n> Program finished.');
        setRunning(false);
        setIsWaitingInput(false);
      }
    } catch (e) {
      if (runId !== runIdRef.current) return;
      setOutput(prev => prev + '\n\n> Execution error.');
      setRunning(false);
      setIsWaitingInput(false);
    }
  };

  const submitInput = async () => {
    if (!userInput.trim() || !isWaitingInput) return;

    const newInputs = [...allInputs, userInput];
    setAllInputs(newInputs);
    setUserInput('');
    setIsWaitingInput(false);
    setRunning(true);

    // Continue with accumulated inputs
    await runAIStep(newInputs, runIdRef.current);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submitInput();
  };

  const handleRun = () => {
    if (mode === 'simulation') runSimulation();
    else startAI();
  };

  if (!file) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-dark-400 text-base">Loading file...</p>
        </div>
      </div>
    );
  }

  const hasSimulation = !!file.simulation_output;

  return (
    <div className="min-h-screen bg-dark-900">
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-40 glass border-b border-dark-500/50"
      >
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link href={file.folder_id ? `/folder/${file.folder_id}` : '/'}>
              <button className="p-3 hover:bg-dark-700/50 rounded-xl transition-colors flex-shrink-0">
                <ArrowLeft size={22} className="text-dark-300" />
              </button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-white truncate">{file.topic || file.name}</h1>
              <p className="text-sm text-dark-400 truncate">{file.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-700 hover:bg-dark-600 border border-dark-500/50 text-sm font-medium transition-all"
            >
              {copied ? <Check size={16} className="text-accent-green" /> : <Copy size={16} className="text-dark-300" />}
              <span className={copied ? 'text-accent-green' : 'text-dark-200'}>
                {copied ? 'Copied' : 'Copy'}
              </span>
            </button>

            {hasSimulation && (
              <div className="hidden sm:flex rounded-xl border border-dark-500/50 overflow-hidden">
                <button
                  onClick={() => setMode('simulation')}
                  className={`px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors ${
                    mode === 'simulation' ? 'bg-purple-500/20 text-purple-400' : 'bg-dark-700 text-dark-400 hover:text-dark-200'
                  }`}
                >
                  <MousePointerClick size={14} /> Simulate
                </button>
                <button
                  onClick={() => setMode('ai')}
                  className={`px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors border-l border-dark-500/50 ${
                    mode === 'ai' ? 'bg-blue-500/20 text-accent-blue' : 'bg-dark-700 text-dark-400 hover:text-dark-200'
                  }`}
                >
                  <Zap size={14} /> AI Run
                </button>
              </div>
            )}

            <button
              onClick={handleRun}
              disabled={running && !isWaitingInput}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-blue hover:bg-blue-500 disabled:bg-blue-500/30 text-white text-sm font-medium transition-all shadow-lg shadow-blue-500/20"
            >
              {running && !isWaitingInput ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              {running && !isWaitingInput ? 'Running...' : mode === 'simulation' ? 'Run Sim' : 'Build & Run'}
            </button>
          </div>
        </div>
      </motion.header>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl overflow-hidden border border-dark-500/50 bg-dark-800 shadow-2xl"
        >
          <div className="bg-dark-700 px-5 py-3.5 flex items-center gap-4 border-b border-dark-500/30">
            <div className="flex gap-2">
              <div className="w-4 h-4 rounded-full bg-accent-red/80" />
              <div className="w-4 h-4 rounded-full bg-accent-orange/80" />
              <div className="w-4 h-4 rounded-full bg-accent-green/80" />
            </div>
            <span className="text-sm text-dark-300 font-mono">{file.name}</span>
            <div className="ml-auto flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-accent-green animate-pulse" />
              <span className="text-xs text-dark-400">C#</span>
            </div>
          </div>

          <SyntaxHighlighter
            language="csharp"
            style={vscDarkPlus}
            showLineNumbers
            customStyle={{
              margin: 0,
              padding: '2rem',
              fontSize: '15px',
              lineHeight: '1.8',
              background: '#0d1117',
              fontFamily: "'JetBrains Mono', monospace",
            }}
            lineNumberStyle={{
              color: '#484f58',
              paddingRight: '2rem',
              fontSize: '13px',
            }}
          >
            {file.content}
          </SyntaxHighlighter>
        </motion.div>

        {hasSimulation && mode === 'simulation' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-5 rounded-2xl bg-purple-500/5 border border-purple-500/20"
          >
            <div className="flex items-start gap-4">
              <MousePointerClick size={22} className="text-purple-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-base font-medium text-purple-300">Simulation Mode Active</p>
                <p className="text-sm text-purple-400/70 mt-1">
                  Pre-defined output. No API needed — runs instantly.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {mode === 'ai' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-5 rounded-2xl bg-blue-500/5 border border-blue-500/20"
          >
            <div className="flex items-start gap-4">
              <Zap size={22} className="text-accent-blue mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-base font-medium text-blue-300">AI Compiler Mode</p>
                <p className="text-sm text-blue-400/70 mt-1">
                  Interactive execution with OpenRouter AI. Type inputs when prompted.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

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
              className="bg-dark-800 border border-dark-500/50 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl"
            >
              <div className="bg-dark-700 px-5 py-4 flex items-center justify-between border-b border-dark-500/30">
                <div className="flex items-center gap-3">
                  <Terminal size={18} className="text-accent-green" />
                  <span className="text-sm font-semibold text-dark-200">
                    {mode === 'simulation' ? 'Simulation Output' : 'AI Compiler Output'}
                  </span>
                  {mode === 'simulation' && (
                    <span className="text-xs bg-purple-500/20 text-purple-400 px-2.5 py-1 rounded-full font-medium">
                      SIMULATION
                    </span>
                  )}
                  {mode === 'ai' && (
                    <span className="text-xs bg-blue-500/20 text-accent-blue px-2.5 py-1 rounded-full font-medium">
                      AI COMPILE
                    </span>
                  )}
                </div>
                <button onClick={() => setShowTerm(false)} className="text-dark-400 hover:text-white transition-colors p-1.5">
                  <X size={20} />
                </button>
              </div>

              <div ref={outputRef} className="p-5 bg-black min-h-[280px] max-h-[480px] overflow-auto font-mono text-base">
                <pre className="text-green-400 whitespace-pre-wrap leading-relaxed">
                  {output}
                  {running && !isWaitingInput && <span className="terminal-cursor">_</span>}
                </pre>
              </div>

              {isWaitingInput && (
                <div className="px-5 py-4 border-t border-dark-500/30 bg-dark-700/50">
                  <div className="flex items-center gap-3">
                    <span className="text-accent-green text-sm font-bold">➜</span>
                    <input
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your input and press Enter..."
                      autoFocus
                      className="flex-1 bg-transparent text-dark-100 text-base font-mono outline-none placeholder-dark-500"
                    />
                    <button
                      onClick={submitInput}
                      disabled={!userInput.trim()}
                      className="p-2 rounded-lg bg-accent-blue hover:bg-blue-500 disabled:bg-dark-600 text-white transition-colors"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-dark-700 px-5 py-3 border-t border-dark-500/30 flex justify-between items-center">
                <span className="text-xs text-dark-400">
                  {mode === 'simulation' ? 'Pre-defined output' : 'Powered by OpenRouter AI'}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      runIdRef.current += 1;
                      setOutput('');
                      setUserInput('');
                      setIsWaitingInput(false);
                      setAllInputs([]);
                      setRunning(false);
                    }}
                    className="px-4 py-2 text-xs rounded-lg bg-dark-600 hover:bg-dark-500 text-dark-300 transition-colors"
                  >
                    Clear
                  </button>
                  {!isWaitingInput && (
                    <button
                      onClick={handleRun}
                      disabled={running}
                      className="px-4 py-2 text-xs rounded-lg bg-accent-green/20 hover:bg-accent-green/30 text-accent-green transition-colors font-medium"
                    >
                      {running ? 'Running...' : 'Run Again'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
