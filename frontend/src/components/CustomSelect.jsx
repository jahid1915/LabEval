import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Building2 } from 'lucide-react';

/**
 * CustomSelect - Sleek, accessible, responsive dropdown menu
 * Features smart auto-alignment (left/right aware) so dropdowns never cut off,
 * clean typography, cursor: pointer, and smooth animations.
 */
export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  icon: Icon = Building2,
  isDarkMode = false,
  align = 'auto', // 'auto' | 'left' | 'right'
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [computedAlign, setComputedAlign] = useState(align === 'auto' ? 'left' : align);
  const containerRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  // Compute smart alignment on open
  useEffect(() => {
    if (isOpen && containerRef.current) {
      if (align === 'right' || align === 'left') {
        setComputedAlign(align);
      } else {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceRight = window.innerWidth - rect.left;
        // If less than 340px on the right or element is in the right half of the screen
        if (spaceRight < 340 || rect.left > window.innerWidth / 2) {
          setComputedAlign('right');
        } else {
          setComputedAlign('left');
        }
      }
    }
  }, [isOpen, align]);

  // Normalize options to { value, label, sublabel }
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt, sublabel: '' };
    }
    return {
      value: opt.value ?? opt.code ?? opt.id,
      label: opt.label ?? opt.code ?? opt.name ?? opt.value,
      sublabel: opt.sublabel ?? opt.name ?? ''
    };
  });

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full min-w-0 ${className}`}
      style={{ zIndex: isOpen ? 50 : 1 }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-left text-xs font-semibold transition-all select-none"
        style={{
          cursor: 'pointer',
          height: '42px',
          boxSizing: 'border-box',
          minWidth: 0,
          background: isDarkMode ? '#1e293b' : '#ffffff',
          borderColor: isOpen 
            ? '#2563eb' 
            : (isDarkMode ? '#334155' : '#cbd5e1'),
          color: isDarkMode ? '#f8fafc' : '#0f172a',
          boxShadow: isOpen ? '0 0 0 3px rgba(37, 99, 235, 0.15)' : 'none'
        }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          {Icon && (
            <Icon 
              size={15} 
              className="shrink-0"
              style={{ color: isOpen ? '#2563eb' : (isDarkMode ? '#94a3b8' : '#64748b') }} 
            />
          )}
          <span className="truncate font-bold tracking-tight text-xs">
            {selectedOption ? selectedOption.label : (
              <span style={{ color: isDarkMode ? '#64748b' : '#94a3b8', fontWeight: 400 }}>
                {placeholder}
              </span>
            )}
          </span>
        </div>

        <ChevronDown
          size={14}
          className="shrink-0 transition-transform duration-200"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            color: isOpen ? '#2563eb' : (isDarkMode ? '#94a3b8' : '#64748b')
          }}
        />
      </button>

      {/* Floating Dropdown Window */}
      {isOpen && (
        <div
          className="mt-1.5 py-1.5 rounded-xl border shadow-2xl overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
          style={{
            position: 'absolute',
            top: '100%',
            left: computedAlign === 'right' ? 'auto' : 0,
            right: computedAlign === 'right' ? 0 : 'auto',
            width: '320px',
            maxWidth: 'calc(100vw - 32px)',
            minWidth: '100%',
            maxHeight: '260px',
            zIndex: 60,
            background: isDarkMode ? '#0f172a' : '#ffffff',
            borderColor: isDarkMode ? '#334155' : '#e2e8f0',
            boxShadow: isDarkMode 
              ? '0 16px 36px rgba(0, 0, 0, 0.7), 0 4px 10px rgba(0, 0, 0, 0.4)' 
              : '0 16px 36px rgba(0, 0, 0, 0.16), 0 4px 10px rgba(0, 0, 0, 0.06)',
            scrollbarWidth: 'thin',
          }}
        >
          {normalizedOptions.length === 0 ? (
            <div className="px-3.5 py-3 text-xs text-center text-slate-400">
              No options available
            </div>
          ) : (
            normalizedOptions.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <div
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className="flex items-center justify-between gap-3 px-3 py-2 mx-1 rounded-lg text-xs transition-colors select-none"
                  title={`${opt.value} - ${opt.sublabel || opt.label}`}
                  style={{
                    cursor: 'pointer',
                    background: isSelected 
                      ? (isDarkMode ? 'rgba(37, 99, 235, 0.2)' : '#eff6ff') 
                      : 'transparent',
                    color: isSelected 
                      ? (isDarkMode ? '#60a5fa' : '#2563eb') 
                      : (isDarkMode ? '#e2e8f0' : '#1e293b'),
                    fontWeight: isSelected ? 700 : 500
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = isDarkMode ? '#1e293b' : '#f8fafc';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span 
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider shrink-0"
                      style={{
                        background: isSelected 
                          ? (isDarkMode ? '#1d4ed8' : '#dbeafe') 
                          : (isDarkMode ? '#334155' : '#f1f5f9'),
                        color: isSelected 
                          ? (isDarkMode ? '#ffffff' : '#1e40af') 
                          : (isDarkMode ? '#cbd5e1' : '#475569')
                      }}
                    >
                      {opt.value}
                    </span>
                    <span className="truncate font-medium text-xs">
                      {opt.sublabel || opt.name || opt.label}
                    </span>
                  </div>

                  {isSelected && (
                    <Check 
                      size={14} 
                      className="shrink-0 ml-1.5"
                      style={{ color: isDarkMode ? '#60a5fa' : '#2563eb' }} 
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
