import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
}

export default function JsonEditor({
  value,
  onChange,
  placeholder = '{\n  "key": "value"\n}',
  disabled,
  rows = 8,
}: JsonEditorProps) {
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    if (!value || value.trim() === '') {
      setError(null);
      setIsValid(true);
      return;
    }

    try {
      JSON.parse(value);
      setError(null);
      setIsValid(true);
    } catch (e) {
      setError((e as Error).message);
      setIsValid(false);
    }
  }, [value]);

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          spellCheck={false}
          className={`w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border rounded-lg text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 font-mono focus:outline-none disabled:opacity-50 resize-y transition-colors ${
            error ? 'border-red-400 dark:border-red-600 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-600'
          }`}
        />
        {/* Validation indicator */}
        {value && value.trim() !== '' && (
          <div className="absolute top-2 right-2">
            {isValid ? (
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500" />
            )}
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
