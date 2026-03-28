
import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useClient } from '../context/ClientContext';
import { Document } from '../types';

const DocumentCard: React.FC<{ name: string; type: string; date: string; size: string; url: string }> = ({ name, type, date, size, url }) => (
  <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:border-brand-green/40 transition-all group cursor-pointer">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded bg-brand-green/10 flex items-center justify-center text-brand-green">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
      </div>
      <div>
        <h4 className="font-bold text-white group-hover:text-brand-green transition-colors truncate max-w-[150px] sm:max-w-md">{name}</h4>
        <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold tracking-widest uppercase mt-1">
          <span>{type}</span>
          <span className="w-1 h-1 rounded-full bg-gray-700" />
          <span>{date}</span>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-6">
      <span className="text-xs text-gray-600 font-bold hidden sm:block">{size}</span>
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
      </a>
    </div>
  </div>
);

const DocumentHub: React.FC = () => {
  const { selectedClient, setSelectedClientId } = useClient();
  const [searchParams] = useSearchParams();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All Assets');

  const fetchDocuments = async () => {
    if (!selectedClient.id || selectedClient.id === 'loading') return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('company_id', selectedClient.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const companyId = searchParams.get('company');
    if (companyId && companyId !== selectedClient.id) {
      setSelectedClientId(companyId);
    }
  }, [searchParams, selectedClient.id, setSelectedClientId]);

  useEffect(() => {
    fetchDocuments();
  }, [selectedClient.id]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch = 
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.type.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = activeCategory === 'All Assets' || doc.category === activeCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [documents, searchTerm, activeCategory]);

  const categories = ['All Assets', 'Brand Manuals', 'Monthly Reports', 'Contractual', 'Archived'];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div>
        <h1 className="text-3xl sm:text-4xl font-heading font-bold text-white tracking-tight">Intelligence Assets</h1>
        <p className="text-gray-400 mt-1">Access your brand manual, strategy reports, and performance summaries.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
        <div className="lg:col-span-1 flex overflow-x-auto pb-2 sm:pb-0 sm:flex-col gap-2 custom-scrollbar">
          {categories.map((cat) => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap sm:whitespace-normal text-left px-4 py-3 rounded-lg font-bold text-sm transition-all ${
                activeCategory === cat 
                  ? 'bg-brand-green text-white' 
                  : 'text-gray-500 hover:text-white hover:bg-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="lg:col-span-3 space-y-6">
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input 
              type="text"
              placeholder="Search assets by name, extension, or date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-white focus:outline-none focus:border-brand-green transition-all placeholder:text-gray-600"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-4 flex items-center text-gray-500 hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>

          <div className="space-y-4">
            {filteredDocuments.length > 0 ? (
              filteredDocuments.map((doc) => (
                <DocumentCard 
                  key={doc.id}
                  name={doc.name} 
                  type={doc.type} 
                  date={new Date(doc.created_at).toLocaleDateString()} 
                  size={doc.size} 
                  url={doc.url}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-gray-600 mb-4 border border-white/5">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="text-white font-bold">No intelligence assets found</h3>
                <p className="text-gray-500 text-sm mt-1">Adjust your search or filter to find what you're looking for.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentHub;
