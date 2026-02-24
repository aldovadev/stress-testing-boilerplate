import { Plus, Trash2 } from 'lucide-react';

interface KeyValuePair {
  key: string;
  value: string;
}

interface HeaderKeyValueEditorProps {
  headers: Record<string, string>;
  onChange: (headers: Record<string, string>) => void;
  disabled?: boolean;
}

export default function HeaderKeyValueEditor({ headers, onChange, disabled }: HeaderKeyValueEditorProps) {
  const pairs: KeyValuePair[] = Object.entries(headers).map(([key, value]) => ({ key, value }));

  // Always show at least one empty row for adding
  if (pairs.length === 0) {
    pairs.push({ key: '', value: '' });
  }

  const updatePair = (index: number, field: 'key' | 'value', newValue: string) => {
    const updated = [...pairs];
    updated[index] = { ...updated[index], [field]: newValue };

    // Convert back to Record, filtering empty keys
    const result: Record<string, string> = {};
    for (const pair of updated) {
      if (pair.key.trim()) {
        result[pair.key.trim()] = pair.value;
      }
    }
    onChange(result);
  };

  const addPair = () => {
    const result = { ...headers, '': '' };
    onChange(result);
  };

  const removePair = (key: string) => {
    const result = { ...headers };
    delete result[key];
    onChange(result);
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_1fr_36px] gap-2 text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">
        <span className="px-2">Key</span>
        <span className="px-2">Value</span>
        <span></span>
      </div>

      {pairs.map((pair, index) => (
        <div key={index} className="grid grid-cols-[1fr_1fr_36px] gap-2">
          <input
            type="text"
            value={pair.key}
            onChange={(e) => updatePair(index, 'key', e.target.value)}
            placeholder="Header name"
            disabled={disabled}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500 dark:focus:border-blue-600 disabled:opacity-50 transition-colors"
          />
          <input
            type="text"
            value={pair.value}
            onChange={(e) => updatePair(index, 'value', e.target.value)}
            placeholder="Header value"
            disabled={disabled}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500 dark:focus:border-blue-600 disabled:opacity-50 transition-colors"
          />
          <button
            onClick={() => removePair(pair.key)}
            disabled={disabled || pairs.length <= 1}
            className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30"
            title="Remove header"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}

      <button
        onClick={addPair}
        disabled={disabled}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-lg transition-colors disabled:opacity-50"
      >
        <Plus className="w-3 h-3" />
        Add Header
      </button>
    </div>
  );
}
