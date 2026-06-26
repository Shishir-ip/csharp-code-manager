'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Play, X, Terminal, ArrowLeft, Zap, MousePointerClick, Check, Send } from 'lucide-react';
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
  const [userInput, setUserInput] = useState('');
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [isWaitingInput, setIsWaitingInput] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<'interactive' | 'real'>('interactive');
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      supabase.from('files').select('*').eq('id', id).single().then(({ data }) => {
        if (data) setFile(data);
      });
    }
  }, [id]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const handleCopy = () => {
    if (file?.content) {
      navigator.clipboard.writeText(file.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // INTERACTIVE SIMULATION - feels like real compiler
  const startInteractive = () => {
    if (!file?.simulation_output) {
      // No simulation, use real run
      handleRealRun();
      return;
    }

    setShowTerm(true);
    setOutput('');
    setInputHistory([]);
    setIsWaitingInput(true);
    setRunning(true);

    // Parse the simulation output to find input prompts
    const lines = file.simulation_output.split('\n');
    let currentLine = 0;
    let currentOutput = '';

    // Show first prompt
    const showNextLine = () => {
      if (currentLine >= lines.length) {
        setRunning(false);
        setIsWaitingInput(false);
        currentOutput += '\n\n> Program finished.';
        setOutput(currentOutput);
        return;
      }

      const line = lines[currentLine];
      
      // Check if this line is an input prompt (ends with :)
      if (line.trim().endsWith(':') && !line.includes('Marks for') && !line.includes('Subject')) {
        // It's a prompt - show it and wait for user input
        currentOutput += line + '\n';
        setOutput(currentOutput);
        setIsWaitingInput(true);
        currentLine++;
      } else {
        // It's output - show it and continue
        currentOutput += line + '\n';
        setOutput(currentOutput);
        currentLine++;
        setTimeout(showNextLine, 100);
      }
    };

    showNextLine();
  };

  const submitInput = () => {
    if (!userInput.trim() || !isWaitingInput) return;
    
    const newHistory = [...inputHistory, userInput];
    setInputHistory(newHistory);
    
    // Add user's input to output
    let currentOutput = output + userInput + '\n';
    setOutput(currentOutput);
    setUserInput('');
    setIsWaitingInput(false);

    // Continue showing next lines until next prompt
    if (!file?.simulation_output) return;
    
    const lines = file.simulation_output.split('\n');
    let found = false;
    let lineCount = 0;
    
    // Count how many lines we've already shown
    const shownLines = output.split('\n').length;
    
    // Find where we left off and continue
    let currentLine = 0;
    let shownCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      if (shownCount >= shownLines - inputHistory.length - 1) {
        currentLine = i;
        break;
      }
      if (!lines[i].trim().endsWith(':') || lines[i].includes('Marks for') || lines[i].includes('Subject')) {
        shownCount++;
      }
    }

    const continueOutput = () => {
      if (currentLine >= lines.length) {
        setRunning(false);
        currentOutput += '\n\n> Program finished.';
        setOutput(currentOutput);
        return;
      }

      const line = lines[currentLine];
      
      if (line.trim().endsWith(':') && !line.includes('Marks for') && !line.includes('Subject')) {
        currentOutput += line + '\n';
        setOutput(currentOutput);
        setIsWaitingInput(true);
        currentLine++;
      } else {
        currentOutput += line + '\n';
        setOutput(currentOutput);
        currentLine++;
        setTimeout(continueOutput, 80);
      }
    };

    setTimeout(continueOutput, 100);
  };

  const handleRealRun = async () => {
    if (!file) return;
    setRunning(true);
    setShowTerm(true);
    setOutput(`> Compiling C# code...\n> Using .NET 9 compiler...\n`);

    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: file.content, stdin: inputHistory.join('\n') }),
      });
      const data = await res.json();

      let result = '';
      if (data.error) {
        result = `\n[ERROR] ${data.error}`;
      } else {
        if (data.output) result += data.output;
        if (data.error && !data.output) result += `\n[ERROR]\n${data.error}`;
        if (!data.output && !data.error) result = '> Execution finished with no output.';
      }
      setOutput(prev => prev + result);
    } catch (e) {
      setOutput(`> Failed to execute code.\n> Tip: Use Interactive Mode for pre-defined output.`);
    } finally {
      setRunning(false);
      setIsWaitingInput(false);
    }
  };

  const handleRun = () => {
    if (mode === 'interactive' && file?.simulation_output) {
      startInteractive();
    } else {
      handleRealRun();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      submitInput();
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
                  onClick={() => setMode('interactive')}
                  className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    mode === 'interactive' ? 'bg-purple-500/20 text-purple-400' : 'bg-dark-700 text-dark-400 hover:text-dark-200'
                  }`}
                >
                  <MousePointerClick size={12} /> Interactive
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
              disabled={running && !isWaitingInput}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-accent-blue hover:bg-blue-500 disabled:bg-blue-500/30 text-white text-xs font-medium transition-all shadow-lg shadow-blue-500/20"
            >
              <Play size={14} />
              {running && !isWaitingInput ? 'Running...' : 'Build & Run'}
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

        {hasSimulation && mode === 'interactive' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-xl bg-purple-500/5 border border-purple-500/20"
          >
            <div className="flex items-start gap-3">
              <MousePointerClick size={18} className="text-purple-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-purple-300">Interactive Mode</p>
                <p className="text-xs text-purple-400/70 mt-1">
                  Click "Build & Run" and type inputs when prompted. Just like a real compiler!
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Interactive Terminal Modal */}
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
                    {mode === 'interactive' ? 'Interactive Terminal' : 'Output Terminal'}
                  </span>
                  {mode === 'interactive' && (
                    <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full font-medium">
                      INTERACTIVE
                    </span>
                  )}
                </div>
                <button onClick={() => setShowTerm(false)} className="text-dark-400 hover:text-white transition-colors p-1">
                  <X size={16} />
                </button>
              </div>

              {/* Terminal Output */}
              <div ref={outputRef} className="p-4 bg-black min-h-[220px] max-h-[400px] overflow-auto font-mono text-sm">
                <pre className="text-green-400 whitespace-pre-wrap leading-relaxed">
                  {output}
                  {running && !isWaitingInput && <span className="terminal-cursor">_</span>}
                </pre>
              </div>

              {/* Input Area - Only shown when waiting for input */}
              {isWaitingInput && (
                <div className="px-4 py-3 border-t border-dark-500/30 bg-dark-700/50">
                  <div className="flex items-center gap-2">
                    <span className="text-accent-green text-xs">➜</span>
                    <input
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your input and press Enter..."
                      autoFocus
                      className="flex-1 bg-transparent text-dark-100 text-sm font-mono outline-none placeholder-dark-500"
                    />
                    <button
                      onClick={submitInput}
                      disabled={!userInput.trim()}
                      className="p-1.5 rounded bg-accent-blue hover:bg-blue-500 disabled:bg-dark-600 text-white transition-colors"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Terminal Footer */}
              <div className="bg-dark-700 px-4 py-2.5 border-t border-dark-500/30 flex justify-between items-center">
                <span className="text-[10px] text-dark-400">
                  {mode === 'interactive' ? 'Type input when prompted' : 'Powered by OnlineCompiler.io'}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setOutput(''); setInputHistory([]); setIsWaitingInput(false); setRunning(false); }}
                    className="px-3 py-1.5 text-[11px] rounded bg-dark-600 hover:bg-dark-500 text-dark-300 transition-colors"
                  >
                    Clear
                  </button>
                  {!isWaitingInput && (
                    <button
                      onClick={handleRun}
                      disabled={running}
                      className="px-3 py-1.5 text-[11px] rounded bg-accent-green/20 hover:bg-accent-green/30 text-accent-green transition-colors font-medium"
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
