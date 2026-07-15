import { useState, useRef, useEffect, useId } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  /** Use the compact (sm) size — less padding, smaller text */
  size?: 'sm' | 'md';
  disabled?: boolean;
  id?: string;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  className = '',
  size = 'md',
  disabled = false,
  id,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const generatedId = useId();
  const triggerId = id ?? generatedId;

  const selectedOption = options.find((o) => o.value === value);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown' && isOpen) {
      e.preventDefault();
      const items = listRef.current?.querySelectorAll<HTMLLIElement>('[role="option"]');
      const currentIdx = Array.from(items ?? []).findIndex((el) =>
        el.dataset.value === value
      );
      const next = items?.[currentIdx + 1] ?? items?.[0];
      next?.focus();
    } else if (e.key === 'ArrowUp' && isOpen) {
      e.preventDefault();
      const items = listRef.current?.querySelectorAll<HTMLLIElement>('[role="option"]');
      const currentIdx = Array.from(items ?? []).findIndex((el) =>
        el.dataset.value === value
      );
      const prev = items?.[currentIdx - 1] ?? items?.[items.length - 1];
      prev?.focus();
    }
  };

  const handleOptionKeyDown = (e: React.KeyboardEvent, optValue: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange(optValue);
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const isSm = size === 'sm';

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger button */}
      <button
        type="button"
        id={triggerId}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={[
          'custom-select-trigger',
          isSm ? 'custom-select-trigger-sm' : '',
          isOpen ? 'custom-select-trigger-open' : '',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span className={selectedOption ? 'custom-select-value' : 'custom-select-placeholder'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={[
            'custom-select-chevron',
            isOpen ? 'rotate-180' : '',
          ].join(' ')}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown list */}
      {isOpen && (
        <ul
          ref={listRef}
          role="listbox"
          aria-labelledby={triggerId}
          className="custom-select-list"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li
                key={opt.value}
                role="option"
                data-value={opt.value}
                aria-selected={isSelected}
                tabIndex={opt.disabled ? -1 : 0}
                onClick={() => {
                  if (!opt.disabled) {
                    onChange(opt.value);
                    setIsOpen(false);
                  }
                }}
                onKeyDown={(e) => !opt.disabled && handleOptionKeyDown(e, opt.value)}
                className={[
                  'custom-select-option',
                  isSelected ? 'custom-select-option-selected' : '',
                  opt.disabled ? 'custom-select-option-disabled' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className="custom-select-option-label">{opt.label}</span>
                {isSelected && (
                  <Check className="custom-select-option-check" aria-hidden="true" />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
