import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

export default function SearchableDropdown({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select Profile", 
  className = "",
  buttonClassName = "",
  variant = "topbar" // "topbar" or "form"
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectedOption = options.find(opt => opt.id === value);

  const filteredOptions = options.filter(opt => 
    !searchQuery || opt.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const buttonStyle = variant === 'topbar' 
    ? 'bg-transparent border border-green-700/30 rounded px-2 py-1 text-green-900 font-bold text-xs'
    : 'w-full bg-white border border-slate-300 px-3 py-2.5 rounded-lg font-medium text-slate-700 text-sm shadow-sm';

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchQuery('');
        }}
        className={`flex items-center justify-between gap-1.5 cursor-pointer focus:outline-none transition-all ${buttonStyle} ${buttonClassName}`}
      >
        <span className="truncate max-w-[150px] md:max-w-none text-left">
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <ChevronDown size={14} className={`text-slate-500 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1 w-64 bg-[#fdfde8] border border-slate-300 rounded-lg shadow-xl p-2 z-[999] animate-in fade-in slide-in-from-top-1 duration-100">
          <div className="relative flex items-center mb-1.5">
            <Search size={12} className="absolute left-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search profiles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-7 py-1 text-xs bg-white border border-slate-300 rounded focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all text-slate-800"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                }
              }}
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                <X size={12} />
              </button>
            )}
          </div>
          
          <div className="max-h-60 overflow-y-auto space-y-0.5 custom-scrollbar text-left">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.id === value;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onChange(opt.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 text-xs rounded transition-colors block truncate ${
                      isSelected 
                        ? 'bg-green-700 text-white font-bold' 
                        : 'text-slate-700 hover:bg-green-50'
                    }`}
                  >
                    {opt.name}
                  </button>
                );
              })
            ) : (
              <div className="text-center text-[10px] text-slate-400 py-3">No profiles found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
