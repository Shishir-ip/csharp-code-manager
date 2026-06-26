'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';
import { FolderPlus, FilePlus, Save, Trash2, Folder, FileCode, LogOut, MousePointerClick, Shield, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type FolderItem = { id: string; name: string; parent_id: string | null; };
type FileItem = { id: string; name: string; folder_id: string | null; topic: string | null; content: string; simulation_output: string | null; simulation_input: string | null; };

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [activeTab, setActiveTab] = useState<'folders' | 'files'>('files');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [folderName, setFolderName] = useState('');
  const [parentFolder, setParentFolder] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileFolder, setFileFolder] = useState('');
  const [fileTopic, setFileTopic] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [simOutput, setSimOutput] = useState('');
  const [simInput, setSimInput] = useState('');
  const [useSimulation, setUseSimulation] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        // Show login form instead of redirecting
        setUser(null);
      } else {
        setUser(data.user);
        loadData();
      }
    });
  }, []);

  async function loadData() {
    const [{ data: fData }, { data: fiData }] = await Promise.all([
      supabase.from('folders').select('*').order('name'),
      supabase.from('files').select('*').order('name')
    ]);
    setFolders(fData || []);
    setFiles(fiData || []);
  }

  function showMessage(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Try sign up instead
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        showMessage('Error: ' + signUpError.message);
        return;
      }
      setUser(signUpData.user);
      showMessage('Account created! Welcome admin.');
    } else {
      setUser(data.user);
      showMessage('Welcome back!');
    }
    loadData();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setFolders([]);
    setFiles([]);
  }

  async function createFolder() {
    if (!folderName.trim()) return;
    setLoading(true);
    const { error } = await supabase.from('folders').insert({
      name: folderName.trim(),
      parent_id: parentFolder || null,
    });
    setLoading(false);
    if (error) { showMessage('Error: ' + error.message); return; }
    setFolderName('');
    setParentFolder('');
    showMessage('Folder created!');
    loadData();
  }

  async function createFile() {
    if (!fileName.trim() || !fileFolder) {
      showMessage('Please enter file name and select folder');
      return;
    }
    setLoading(true);
    const name = fileName.trim().endsWith('.cs') ? fileName.trim() : `${fileName.trim()}.cs`;
    const { error } = await supabase.from('files').insert({
      name,
      folder_id: fileFolder,
      topic: fileTopic.trim() || null,
      content: fileContent,
      simulation_output: useSimulation ? (simOutput.trim() || null) : null,
      simulation_input: useSimulation ? (simInput.trim() || null) : null,
    });
    setLoading(false);
    if (error) { showMessage('Error: ' + error.message); return; }
    setFileName('');
    setFileTopic('');
    setFileContent('');
    setSimOutput('');
    setSimInput('');
    showMessage('File added!');
    loadData();
  }

  async function deleteFolder(id: string) {
    if (!confirm('Delete this folder and all contents?')) return;
    await supabase.from('folders').delete().eq('id', id);
    loadData();
  }

  async function deleteFile(id: string) {
    if (!confirm('Delete this file?')) return;
    await supabase.from('files').delete().eq('id', id);
    loadData();
  }

  // LOGIN SCREEN
  if (!user) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm bg-dark-800 rounded-2xl border border-dark-500/50 p-8 shadow-2xl"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Admin Login</h1>
              <p className="text-xs text-dark-400">Sign in to manage files</p>
            </div>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Email</label>
              <input
                name="email"
                type="email"
                required
                placeholder="your@email.com"
                className="w-full px-3 py-2 bg-dark-900 border border-dark-500/50 rounded-lg focus:outline-none focus:border-accent-blue text-sm text-dark-100 placeholder-dark-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Password</label>
              <input
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-dark-900 border border-dark-500/50 rounded-lg focus:outline-none focus:border-accent-blue text-sm text-dark-100 placeholder-dark-500"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-accent-blue hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all"
            >
              Sign In / Sign Up
            </button>
          </form>
          
          <p className="text-[10px] text-dark-500 mt-4 text-center">
            First time? Enter email + password to create account automatically.
          </p>
          
          <Link href="/" className="block mt-6 text-center">
            <span className="text-xs text-dark-400 hover:text-accent-blue transition-colors flex items-center justify-center gap-1">
              <ArrowLeft size={12} /> Back to Home
            </span>
          </Link>
        </motion.div>
      </div>
    );
  }

  // ADMIN DASHBOARD
  return (
    <div className="min-h-screen bg-dark-900">
      <header className="sticky top-0 z-40 glass border-b border-dark-500/50">
        <div className="max-w-5xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">Admin Panel</h1>
              <p className="text-[10px] text-dark-300">Manage C# lab files</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/">
              <button className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-dark-700 hover:bg-dark-600 border border-dark-500/50 text-dark-200 transition-all">
                <ArrowLeft size={14} /> Home
              </button>
            </Link>
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-dark-700 hover:bg-dark-600 border border-dark-500/50 text-dark-200 transition-all">
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-4 left-1/2 bg-accent-green/90 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-xs font-medium backdrop-blur-sm"
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
        <div className="flex gap-1 p-1 bg-dark-700/50 rounded-xl border border-dark-500/30 w-fit mb-6">
          <button
            onClick={() => setActiveTab('files')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${activeTab === 'files' ? 'bg-dark-600 text-white shadow-sm' : 'text-dark-400 hover:text-dark-200'}`}
          >
            <FilePlus size={14} /> Add Files
          </button>
          <button
            onClick={() => setActiveTab('folders')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${activeTab === 'folders' ? 'bg-dark-600 text-white shadow-sm' : 'text-dark-400 hover:text-dark-200'}`}
          >
            <FolderPlus size={14} /> Add Folders
          </button>
        </div>

        {activeTab === 'files' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-dark-800 rounded-xl border border-dark-500/30 p-6">
              <h2 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
                <FileCode size={16} className="text-accent-blue" /> Add New C# File
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-dark-300 mb-1.5">File Name</label>
                  <input type="text" value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="e.g. HelloWorld" className="w-full px-3 py-2 bg-dark-900 border border-dark-500/50 rounded-lg focus:outline-none focus:border-accent-blue text-sm text-dark-100 placeholder-dark-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-dark-300 mb-1.5">Folder</label>
                  <select value={fileFolder} onChange={(e) => setFileFolder(e.target.value)} className="w-full px-3 py-2 bg-dark-900 border border-dark-500/50 rounded-lg focus:outline-none focus:border-accent-blue text-sm text-dark-100">
                    <option value="" className="bg-dark-800">Select a folder...</option>
                    {folders.map((f) => (<option key={f.id} value={f.id} className="bg-dark-800">{f.name}</option>))}
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-medium text-dark-300 mb-1.5">Topic / Question</label>
                <input type="text" value={fileTopic} onChange={(e) => setFileTopic(e.target.value)} placeholder="e.g. Lab 1: Calculate factorial" className="w-full px-3 py-2 bg-dark-900 border border-dark-500/50 rounded-lg focus:outline-none focus:border-accent-blue text-sm text-dark-100 placeholder-dark-500" />
              </div>
              <div className="mb-4">
                <label className="block text-xs font-medium text-dark-300 mb-1.5">C# Code</label>
                <textarea value={fileContent} onChange={(e) => setFileContent(e.target.value)} placeholder="using System; class Program { static void Main() { Console.WriteLine(&quot;Hello&quot;); } }" className="w-full px-3 py-2 bg-dark-900 border border-dark-500/50 rounded-lg focus:outline-none focus:border-accent-blue text-sm font-mono text-dark-100 placeholder-dark-500 min-h-[200px] resize-y" />
              </div>

              <div className="mb-5 p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <input type="checkbox" id="simToggle" checked={useSimulation} onChange={(e) => setUseSimulation(e.target.checked)} className="w-4 h-4 rounded border-dark-500 bg-dark-900 text-purple-500" />
                  <label htmlFor="simToggle" className="text-xs font-medium text-purple-300 flex items-center gap-2 cursor-pointer">
                    <MousePointerClick size={14} /> Enable Simulation Mode (No API needed)
                  </label>
                </div>
                <p className="text-[11px] text-purple-400/60 mb-3">Paste the expected output here. Users will see it in a terminal popup without needing any external API.</p>
                {useSimulation && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-medium text-purple-400/80 mb-1">Expected Input (optional, one per line)</label>
                      <textarea value={simInput} onChange={(e) => setSimInput(e.target.value)} placeholder="5&#10;John" className="w-full px-3 py-2 bg-dark-900 border border-purple-500/30 rounded-lg focus:outline-none focus:border-purple-400 text-xs font-mono text-dark-100 placeholder-dark-500 resize-y" rows={2} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-purple-400/80 mb-1">Expected Output</label>
                      <textarea value={simOutput} onChange={(e) => setSimOutput(e.target.value)} placeholder="Enter a number: 5&#10;Factorial is: 120" className="w-full px-3 py-2 bg-dark-900 border border-purple-500/30 rounded-lg focus:outline-none focus:border-purple-400 text-xs font-mono text-dark-100 placeholder-dark-500 resize-y" rows={4} />
                    </div>
                  </div>
                )}
              </div>

              <button onClick={createFile} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-accent-blue hover:bg-blue-500 disabled:bg-blue-500/30 text-white rounded-lg text-xs font-medium transition-all">
                <Save size={14} /> {loading ? 'Saving...' : 'Save File'}
              </button>
            </div>

            <div className="bg-dark-800 rounded-xl border border-dark-500/30 p-6">
              <h2 className="text-sm font-bold text-white mb-4">Existing Files ({files.length})</h2>
              <div className="space-y-1">
                {files.map((f) => (
                  <div key={f.id} className="flex items-center justify-between p-3 bg-dark-700/30 rounded-lg hover:bg-dark-700/60 transition-colors group">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileCode size={16} className="text-accent-orange flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-dark-200 truncate">{f.name}</p>
                        <p className="text-[10px] text-dark-500 truncate">{f.topic || 'No topic'}</p>
                      </div>
                      {f.simulation_output && (
                        <span className="text-[10px] bg-purple-500/15 text-purple-400 px-2 py-0.5 rounded-full font-medium flex-shrink-0">Sim</span>
                      )}
                    </div>
                    <button onClick={() => deleteFile(f.id)} className="p-1.5 text-dark-500 hover:text-accent-red hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {files.length === 0 && <p className="text-dark-500 text-xs text-center py-6">No files yet</p>}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'folders' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-dark-800 rounded-xl border border-dark-500/30 p-6">
              <h2 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
                <FolderPlus size={16} className="text-accent-blue" /> Create New Folder
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-dark-300 mb-1.5">Folder Name</label>
                  <input type="text" value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder="e.g. Week 1 - Basics" className="w-full px-3 py-2 bg-dark-900 border border-dark-500/50 rounded-lg focus:outline-none focus:border-accent-blue text-sm text-dark-100 placeholder-dark-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-dark-300 mb-1.5">Parent Folder (Optional)</label>
                  <select value={parentFolder} onChange={(e) => setParentFolder(e.target.value)} className="w-full px-3 py-2 bg-dark-900 border border-dark-500/50 rounded-lg focus:outline-none focus:border-accent-blue text-sm text-dark-100">
                    <option value="" className="bg-dark-800">None (Root)</option>
                    {folders.map((f) => (<option key={f.id} value={f.id} className="bg-dark-800">{f.name}</option>))}
                  </select>
                </div>
              </div>
              <button onClick={createFolder} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-accent-blue hover:bg-blue-500 disabled:bg-blue-500/30 text-white rounded-lg text-xs font-medium transition-all">
                <Save size={14} /> {loading ? 'Saving...' : 'Create Folder'}
              </button>
            </div>

            <div className="bg-dark-800 rounded-xl border border-dark-500/30 p-6">
              <h2 className="text-sm font-bold text-white mb-4">Existing Folders ({folders.length})</h2>
              <div className="space-y-1">
                {folders.map((f) => (
                  <div key={f.id} className="flex items-center justify-between p-3 bg-dark-700/30 rounded-lg hover:bg-dark-700/60 transition-colors group">
                    <div className="flex items-center gap-3">
                      <Folder size={16} className="text-accent-blue" />
                      <span className="text-xs font-medium text-dark-200">{f.name}</span>
                    </div>
                    <button onClick={() => deleteFolder(f.id)} className="p-1.5 text-dark-500 hover:text-accent-red hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {folders.length === 0 && <p className="text-dark-500 text-xs text-center py-6">No folders yet</p>}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
