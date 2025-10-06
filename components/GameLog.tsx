
import React, { useRef, useEffect } from 'react';
// Fix: Added .ts extension to the import path.
import { LogEntry } from '../types.ts';

interface GameLogProps {
  log: LogEntry[];
}

const GameLog: React.FC<GameLogProps> = ({ log }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [log]);

  return (
    <div className="bg-gray-800/50 rounded-lg shadow-lg p-4 flex flex-col h-full border border-teal-500/20">
      <h2 className="text-xl font-bold mb-4 text-teal-300 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
        Event Log
      </h2>
      <div ref={logContainerRef} className="flex-grow overflow-y-auto pr-2 space-y-2 text-sm">
        {log.map(entry => (
          <div key={entry.id} className="text-gray-300">
            <span className="font-mono text-gray-500 mr-2">[{new Date(entry.timestamp).toLocaleTimeString()}]</span>
            {entry.message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GameLog;