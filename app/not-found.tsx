'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileX, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="w-24 h-24 rounded-3xl bg-dark-700/50 flex items-center justify-center mx-auto mb-6 border border-dark-500/30">
          <FileX size={48} className="text-dark-400" />
        </div>
        <h1 className="text-5xl font-bold text-white mb-2">404</h1>
        <h2 className="text-xl font-semibold text-dark-200 mb-3">Page Not Found</h2>
        <p className="text-dark-400 mb-8">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/">
            <button className="flex items-center gap-2 px-5 py-2.5 bg-accent-blue hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-all">
              <Home size={16} /> Go Home
            </button>
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-5 py-2.5 bg-dark-700 hover:bg-dark-600 border border-dark-500/50 text-dark-200 rounded-xl text-sm font-medium transition-all"
          >
            <ArrowLeft size={16} /> Go Back
          </button>
        </div>
      </motion.div>
    </div>
  );
}
