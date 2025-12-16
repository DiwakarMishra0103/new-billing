import React, { useState, useRef, useEffect } from 'react';
import { Client, Expense } from '../types';
import { chatWithData } from '../services/geminiService';
import { MessageSquare, X, Send, Sparkles, Loader2, ChevronDown } from 'lucide-react';

interface AIChatWidgetProps {
  clients: Client[];
  expenses: Expense[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const AIChatWidget: React.FC<AIChatWidgetProps> = ({ clients, expenses }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', text: 'Hi! I can help you analyze your agency data. Ask me about overdue clients, total revenue, or specific project details.' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: inputText };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const responseText = await chatWithData(userMsg.text, clients, expenses);
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', text: responseText };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      const errorMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', text: "Sorry, I encountered an error processing your request." };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestionChips = [
    "Overdue Clients",
    "Total Profit",
    "Active Projects",
    "Highest Paying Client"
  ];

  const handleChipClick = (chip: string) => {
    setInputText(chip);
    // Optional: auto-send
    // handleSend(); 
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center group"
      >
        <Sparkles className="h-6 w-6 absolute opacity-0 group-hover:opacity-100 transition-opacity scale-75 group-hover:scale-100" />
        <MessageSquare className="h-6 w-6 group-hover:opacity-0 transition-opacity" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-300 max-h-[600px]">
      {/* Header */}
      <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          <div>
            <h3 className="font-bold text-sm">Agency AI Assistant</h3>
            <p className="text-[10px] text-indigo-200">Powered by Gemini</p>
          </div>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-indigo-100 hover:text-white hover:bg-indigo-500/50 p-1 rounded-full transition-colors">
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 min-h-[300px]">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-br-none' 
                  : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'
              }`}
            >
              {msg.text.split('\n').map((line, i) => (
                <p key={i} className="mb-1 last:mb-0">{line}</p>
              ))}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
              <Loader2 className="h-5 w-5 text-indigo-600 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100">
        {/* Suggestion Chips */}
        {messages.length < 3 && (
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
            {suggestionChips.map(chip => (
              <button
                key={chip}
                onClick={() => handleChipClick(chip)}
                className="whitespace-nowrap px-3 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 text-xs font-medium rounded-full border border-slate-200 transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        )}
        
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask about your data..."
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all placeholder-slate-400"
          />
          <button 
            onClick={handleSend}
            disabled={!inputText.trim() || isLoading}
            className="absolute right-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatWidget;