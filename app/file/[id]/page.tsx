'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Play, X, Terminal, ArrowLeft, Zap, MousePointerClick, Check, Send, Loader2, FileCode, Share2, Download } from 'lucide-react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Lazy-load syntax highlighter component to reduce bundle size
const SyntaxHighlighter = dynamic(
  () => import('react-syntax-highlighter').then((mod) => mod.Prism),
  { ssr: false, loading: () => <div className="p-8 text-dark-400 animate-pulse">Loading code viewer...</div> }
);

type FileData = {
  id: string;
  name: string;
  topic: string | null;
  content: string;
  folder_id: string | null;
  simulation_output: string | null;
};

type ConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
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
  const [shared, setShared] = useState(false);
  const [mode, setMode] = useState<'simulation' | 'ai'>('simulation');
  const [allInputs, setAllInputs] = useState<string[]>([]);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [topicExpanded, setTopicExpanded] = useState(false);
  const [needsMore, setNeedsMore] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [highlighterReady, setHighlighterReady] = useState(false);
  const topicRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const runIdRef = useRef(0);

  // Detect theme
  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkTheme(isDark);
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Mark highlighter as ready after mount
  useEffect(() => {
    setHighlighterReady(true);
  }, []);

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

  // Check if topic text exceeds 3 lines
  useEffect(() => {
    if (topicRef.current && file?.topic) {
      const el = topicRef.current;
      if (!topicExpanded) {
        setNeedsMore(el.scrollHeight > el.clientHeight + 2);
      } else {
        setNeedsMore(false);
      }
    }
  }, [file?.topic, topicExpanded]);

  const handleCopy = () => {
    if (file?.content) {
      navigator.clipboard.writeText(file.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  const handleDownload = () => {
    if (!file) return;
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name.endsWith('.cs') ? file.name : `${file.name}.cs`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // SIMULATION MODE
  const runSimulation = () => {
    if (!file?.simulation_output) {
      setShowTerm(true);
      setOutput('> No simulation output defined.');
      return;
    }
    runIdRef.current += 1;
    setShowTerm(true);
    setOutput('');
    setAllInputs([]);
    setIsWaitingInput(false);
    setRunning(false);
    setConversation([]);

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

  // AI MODE
  const startAI = async () => {
    if (!file) return;
    runIdRef.current += 1;
    const currentRunId = runIdRef.current;

    setRunning(true);
    setShowTerm(true);
    setOutput('');
    setAllInputs([]);
    setIsWaitingInput(false);
    setUserInput('');
    setConversation([]);

    setOutput(`> Compiling C# code...\n> Using AI Compiler (OpenRouter)...\n\n`);
    await runAIStep([], [], currentRunId);
  };

  const runAIStep = async (currentInputs: string[], currentConversation: ConversationMessage[], runId: number) => {
    if (runId !== runIdRef.current) return;

    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: file?.content || '',
          inputs: currentInputs,
          conversation: currentConversation,
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
      const newAssistantMsg: ConversationMessage = { role: 'assistant', content: aiText };
      const updatedConversation = [...currentConversation, newAssistantMsg];
      setConversation(updatedConversation);

      const outputToAdd = aiText ? (aiText + '\n') : '';
      setOutput(prev => {
        const systemHeader = `> Compiling C# code...\n> Using AI Compiler (OpenRouter)...\n\n`;
        return systemHeader + outputToAdd;
      });

      if (data.hasMoreInput) {
        setIsWaitingInput(true);
        setRunning(false);
      } else {
        setOutput(prev => prev + '\n> Program finished.');
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

    const newUserMsg: ConversationMessage = { role: 'user', content: `User input: ${userInput}` };
    const updatedConversation = [...conversation, newUserMsg];
    setConversation(updatedConversation);

    await runAIStep(newInputs, updatedConversation, runIdRef.current);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submitInput();
  };

  const handleRun = () => {
    if (mode === 'simulation') runSimulation();
    else startAI();
  };

  const topicText = file?.topic || file?.name || '';
  const currentStyle = isDarkTheme ? vscDarkPlus : oneLight;

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
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="min-h-screen bg-dark-900 flex flex-col"
    >
      {/* ===== HEADER - Mobile Responsive ===== */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-40 glass border-b border-dark-500/30"
      >
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-8 h-auto min-h-[56px] py-2.5 md:h-20 md:py-0 flex items-center justify-between gap-2 md:gap-4">
          <div className="flex items-center gap-2.5 md:gap-4 min-w-0">
            <Link href={file.folder_id ? `/folder/${file.folder_id}` : '/'}>
              <button className="p-2 md:p-3 hover:bg-dark-700/50 rounded-lg md:rounded-xl transition-colors flex-shrink-0">
                <ArrowLeft size={20} className="text-dark-300 md:w-[22px] md:h-[22px]" />
              </button>
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-0.5">
                <div
                  ref={topicRef}
                  className={`text-sm md:text-base font-bold text-white cursor-pointer transition-all leading-snug ${
                    topicExpanded ? '' : 'line-clamp-2'
                  }`}
                  onClick={() => setTopicExpanded(!topicExpanded)}
                  title="Click to expand/collapse"
                >
                  {topicText}
                </div>
                {!topicExpanded && needsMore && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowTopicModal(true); }}
                    className="text-[11px] md:text-xs text-accent-blue hover:text-blue-400 font-medium self-start mt-0.5 transition-colors"
                  >
                    ...more
                  </button>
                )}
                {topicExpanded && needsMore && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setTopicExpanded(false); }}
                    className="text-[11px] md:text-xs text-accent-blue hover:text-blue-400 font-medium self-start mt-0.5 transition-colors"
                  >
                    Show less
                  </button>
                )}
                <p className="text-xs md:text-sm text-dark-400 truncate">{file.name}</p>
              </div>
            </div>
          </div>

          {/* ===== ACTION BUTTONS - Icon-only on mobile ===== */}
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            {/* Share - icon only on mobile */}
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-2 rounded-lg md:rounded-xl bg-dark-700 hover:bg-dark-600 border border-dark-500/50 text-xs md:text-sm font-medium transition-all"
              title="Copy shareable link"
            >
              {shared ? <Check size={14} className="text-accent-green md:w-4 md:h-4" /> : <Share2 size={14} className="text-dark-300 md:w-4 md:h-4" />}
              <span className={`hidden sm:inline ${shared ? 'text-accent-green' : 'text-dark-200'}`}>
                {shared ? 'Copied' : 'Share'}
              </span>
            </button>
            {/* Download - icon only on mobile */}
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-2 rounded-lg md:rounded-xl bg-dark-700 hover:bg-dark-600 border border-dark-500/50 text-xs md:text-sm font-medium transition-all"
              title="Download as .cs file"
            >
              <Download size={14} className="text-dark-300 md:w-4 md:h-4" />
              <span className="hidden sm:inline text-dark-200">Download</span>
            </button>
            {/* Copy - icon only on mobile */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-2 rounded-lg md:rounded-xl bg-dark-700 hover:bg-dark-600 border border-dark-500/50 text-xs md:text-sm font-medium transition-all"
              title="Copy code"
            >
              {copied ? <Check size={14} className="text-accent-green md:w-4 md:h-4" /> : <Copy size={14} className="text-dark-300 md:w-4 md:h-4" />}
              <span className={`hidden sm:inline ${copied ? 'text-accent-green' : 'text-dark-200'}`}>
                {copied ? 'Copied' : 'Copy'}
              </span>
            </button>

            {/* Mode toggle - hidden on very small screens */}
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

            {/* Run button - compact on mobile */}
            <button
              onClick={handleRun}
              disabled={running && !isWaitingInput}
              className="flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl bg-accent-blue hover:bg-blue-500 disabled:bg-blue-500/30 text-white text-xs md:text-sm font-medium transition-all shadow-lg shadow-blue-500/20"
            >
              {running && !isWaitingInput ? <Loader2 size={14} className="animate-spin md:w-4 md:h-4" /> : <Play size={14} className="md:w-4 md:h-4" />}
              <span className="hidden sm:inline">
                {running && !isWaitingInput ? 'Running...' : mode === 'simulation' ? 'Run Sim' : 'Build & Run'}
              </span>
            </button>
          </div>
        </div>
      </motion.header>

      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-8 py-4 md:py-8 flex-1 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl overflow-hidden border border-dark-500/50 bg-dark-800 shadow-2xl"
        >
          <div className="bg-dark-700 px-4 md:px-5 py-2.5 md:py-3.5 flex items-center gap-3 md:gap-4 border-b border-dark-500/30">
            <div className="flex gap-1.5 md:gap-2">
              <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-accent-red/80" />
              <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-accent-orange/80" />
              <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-accent-green/80" />
            </div>
            <span className="text-xs md:text-sm text-dark-300 font-mono truncate">{file.name}</span>
            <div className="ml-auto flex items-center gap-2">
              <span className="w-2 md:w-2.5 h-2 md:h-2.5 rounded-full bg-accent-green animate-pulse" />
              <span className="text-[10px] md:text-xs text-dark-400">C#</span>
            </div>
          </div>

          {highlighterReady ? (
            <SyntaxHighlighter
              language="csharp"
              style={currentStyle}
              showLineNumbers
              customStyle={{
                margin: 0,
                padding: '1rem',
                fontSize: '13px',
                lineHeight: '1.7',
                background: isDarkTheme ? '#0d1117' : '#f6f8fa',
                fontFamily: "'JetBrains Mono', monospace",
              }}
              lineNumberStyle={{
                color: isDarkTheme ? '#484f58' : '#9aa0a6',
                paddingRight: '1rem',
                fontSize: '11px',
              }}
            >
              {file.content}
            </SyntaxHighlighter>
          ) : (
            <div className="p-8 bg-dark-800 text-dark-400 animate-pulse">Loading syntax highlighter...</div>
          )}
        </motion.div>

        {hasSimulation && mode === 'simulation' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 md:mt-6 p-4 md:p-5 rounded-2xl bg-purple-500/5 border border-purple-500/20"
          >
            <div className="flex items-start gap-3 md:gap-4">
              <MousePointerClick size={20} className="text-purple-400 mt-0.5 flex-shrink-0 md:w-[22px] md:h-[22px]" />
              <div>
                <p className="text-sm md:text-base font-medium text-purple-300">Simulation Mode Active</p>
                <p className="text-xs md:text-sm text-purple-400/70 mt-1">
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
            className="mt-4 md:mt-6 p-4 md:p-5 rounded-2xl bg-blue-500/5 border border-blue-500/20"
          >
            <div className="flex items-start gap-3 md:gap-4">
              <Zap size={20} className="text-accent-blue mt-0.5 flex-shrink-0 md:w-[22px] md:h-[22px]" />
              <div>
                <p className="text-sm md:text-base font-medium text-blue-300">AI Compiler Mode</p>
                <p className="text-xs md:text-sm text-blue-400/70 mt-1">
                  Interactive execution with OpenRouter AI. Type inputs when prompted.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* ===== TOPIC MODAL - Mobile Responsive ===== */}
      <AnimatePresence>
        {showTopicModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
            onClick={() => setShowTopicModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-dark-800 border border-dark-500/50 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl overflow-hidden max-h-[85vh] sm:max-h-none"
            >
              <div className="bg-dark-700 px-4 md:px-5 py-3 md:py-4 flex items-center justify-between border-b border-dark-500/30">
                <div className="flex items-center gap-3">
                  <FileCode size={16} className="text-accent-blue md:w-[18px] md:h-[18px]" />
                  <span className="text-xs md:text-sm font-semibold text-dark-200">Full Topic</span>
                </div>
                <button
                  onClick={() => setShowTopicModal(false)}
                  className="text-dark-400 hover:text-white transition-colors p-1.5"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 md:p-6 max-h-[60vh] overflow-auto">
                <p className="text-sm md:text-base text-white leading-relaxed whitespace-pre-wrap">
                  {topicText}
                </p>
              </div>
              <div className="bg-dark-700 px-4 md:px-5 py-3 border-t border-dark-500/30 flex justify-end">
                <button
                  onClick={() => setShowTopicModal(false)}
                  className="px-4 py-2 text-xs rounded-lg bg-accent-blue hover:bg-blue-500 text-white transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== TERMINAL MODAL - Mobile Responsive ===== */}
      <AnimatePresence>
        {showTerm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
            onClick={() => setShowTerm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-dark-800 border border-dark-500/50 rounded-t-2xl sm:rounded-2xl w-full sm:w-auto sm:max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh]"
            >
              <div className="bg-dark-700 px-4 md:px-5 py-3 md:py-4 flex items-center justify-between border-b border-dark-500/30 flex-shrink-0">
                <div className="flex items-center gap-2 md:gap-3">
                  <Terminal size={16} className="text-accent-green md:w-[18px] md:h-[18px]" />
                  <span className="text-xs md:text-sm font-semibold text-dark-200">
                    {mode === 'simulation' ? 'Simulation Output' : 'AI Compiler Output'}
                  </span>
                  {mode === 'simulation' && (
                    <span className="text-[10px] md:text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 md:px-2.5 md:py-1 rounded-full font-medium">
                      SIM
                    </span>
                  )}
                  {mode === 'ai' && (
                    <span className="text-[10px] md:text-xs bg-blue-500/20 text-accent-blue px-2 py-0.5 md:px-2.5 md:py-1 rounded-full font-medium">
                      AI
                    </span>
                  )}
                </div>
                <button onClick={() => setShowTerm(false)} className="text-dark-400 hover:text-white transition-colors p-1.5">
                  <X size={18} />
                </button>
              </div>

              <div ref={outputRef} className="p-4 md:p-5 bg-black overflow-auto font-mono text-sm md:text-base flex-1 min-h-[200px] max-h-[50vh] sm:max-h-[480px]">
                <pre className="text-green-400 whitespace-pre-wrap leading-relaxed">
                  {output}
                  {running && !isWaitingInput && <span className="terminal-cursor">_</span>}
                </pre>
              </div>

              {isWaitingInput && (
                <div className="px-4 md:px-5 py-3 md:py-4 border-t border-dark-500/30 bg-dark-700/50 flex-shrink-0">
                  <div className="flex items-center gap-2 md:gap-3">
                    <span className="text-accent-green text-sm font-bold">➜</span>
                    <input
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your input and press Enter..."
                      autoFocus
                      className="flex-1 bg-transparent text-dark-100 text-sm md:text-base font-mono outline-none placeholder-dark-500"
                    />
                    <button
                      onClick={submitInput}
                      disabled={!userInput.trim()}
                      className="p-2 rounded-lg bg-accent-blue hover:bg-blue-500 disabled:bg-dark-600 text-white transition-colors"
                    >
                      <Send size={16} className="md:w-[18px] md:h-[18px]" />
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-dark-700 px-4 md:px-5 py-2.5 md:py-3 border-t border-dark-500/30 flex justify-between items-center flex-shrink-0">
                <span className="text-[10px] md:text-xs text-dark-400">
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
                      setConversation([]);
                    }}
                    className="px-3 md:px-4 py-1.5 md:py-2 text-xs rounded-lg bg-dark-600 hover:bg-dark-500 text-dark-300 transition-colors"
                  >
                    Clear
                  </button>
                  {!isWaitingInput && (
                    <button
                      onClick={handleRun}
                      disabled={running}
                      className="px-3 md:px-4 py-1.5 md:py-2 text-xs rounded-lg bg-accent-green/20 hover:bg-accent-green/30 text-accent-green transition-colors font-medium"
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
    </motion.div>
  );
}
