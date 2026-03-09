
import React, { useState, useMemo } from 'react';
import { useClient } from '../context/ClientContext';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

const DocumentCard: React.FC<{ id: string; name: string; type: string; date: string; size: string; isAdmin: boolean; onDelete: (id: string) => void }> = ({ id, name, type, date, size, isAdmin, onDelete }) => (
  <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:border-brand-green/40 transition-all group cursor-pointer">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded bg-brand-green/10 flex items-center justify-center text-brand-green">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
      </div>
      <div>
        <h4 className="font-bold text-white group-hover:text-brand-green transition-colors truncate max-w-[200px] md:max-w-md">{name}</h4>
        <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold tracking-widest uppercase mt-1">
          <span>{type}</span>
          <span className="w-1 h-1 rounded-full bg-gray-700" />
          <span>{date}</span>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-6">
      <span className="text-xs text-gray-600 font-bold hidden sm:block">{size}</span>
      <div className="flex items-center gap-2">
        <button className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        </button>
        {isAdmin && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Are you sure you want to delete this intelligence asset?')) {
                onDelete(id);
              }
            }}
            className="text-gray-600 hover:text-red-500 transition-colors p-2 hover:bg-red-500/10 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        )}
      </div>
    </div>
  </div>
);

const DocumentHub: React.FC = () => {
  const { selectedClient, documents, deleteDocument } = useClient();
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All Assets');

  const isAdmin = profile?.role === UserRole.ADMIN;

  const clientDocuments = useMemo(() => {
    return documents.filter(d => d.company_id === selectedClient.id);
  }, [documents, selectedClient.id]);

  const filteredDocuments = useMemo(() => {
    return clientDocuments.filter((doc) => {
      const matchesSearch = 
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.file_type || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = activeCategory === 'All Assets' || doc.category === activeCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [clientDocuments, searchTerm, activeCategory]);

  const categories = ['All Assets', 'Brand Manuals', 'Monthly Reports', 'Contractual', 'Archived'];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div>
        <h1 className="text-3xl sm:text-4xl font-heading font-bold text-white tracking-tight">Intelligence Assets</h1>
        <p className="text-gray-400 mt-1">Access your brand manual, strategy reports, and performance summaries.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-2">
          {categories.map((cat) => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`w-full text-left px-4 py-3 rounded-lg font-bold text-sm transition-all ${
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
                  id={doc.id}
                  name={doc.name} 
                  type={doc.type || 'FILE'} 
                  date={new Date(doc.created_at).toLocaleDateString()} 
                  size={doc.size || 'N/A'} 
                  isAdmin={isAdmin}
                  onDelete={deleteDocument}
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
