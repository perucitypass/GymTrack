import React, { useState, useEffect } from 'react';

interface DecimalWeightInputProps {
  value: number;
  onChange: (val: number) => void;
  onAdjust?: (delta: number) => void;
  showSteppers?: boolean;
  min?: number;
  placeholder?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const DecimalWeightInput: React.FC<DecimalWeightInputProps> = ({
  value,
  onChange,
  onAdjust,
  showSteppers = true,
  min = 0,
  placeholder = '0',
  className = '',
  size = 'md',
}) => {
  const [localText, setLocalText] = useState<string>(value === 0 ? '' : value.toString());

  // Keep in sync with external value updates (e.g. from template loading or external reset)
  useEffect(() => {
    const currentNum = parseFloat(localText.replace(',', '.'));
    if (isNaN(currentNum) ? value !== 0 : currentNum !== value) {
      setLocalText(value === 0 ? '' : value.toString());
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(',', '.');
    // Allow empty, digits, and a single decimal point (e.g. "12", "12.", "12.5")
    if (/^[0-9]*\.?[0-9]*$/.test(raw)) {
      setLocalText(raw);
      if (raw === '' || raw === '.') {
        onChange(0);
      } else {
        const parsed = parseFloat(raw);
        if (!isNaN(parsed)) {
          // Keep precision to 1 decimal place max (0.5 increments or single decimal)
          const rounded = Math.round(parsed * 10) / 10;
          onChange(Math.max(min, rounded));
        }
      }
    }
  };

  const handleBlur = () => {
    const raw = localText.replace(',', '.');
    const parsed = parseFloat(raw);
    if (isNaN(parsed) || parsed < min) {
      setLocalText(min > 0 ? min.toString() : '');
      onChange(min);
    } else {
      const rounded = Math.round(parsed * 10) / 10;
      setLocalText(rounded === 0 && min === 0 ? '' : rounded.toString());
      onChange(rounded);
    }
  };

  const handleStep = (delta: number) => {
    if (onAdjust) {
      onAdjust(delta);
    } else {
      const current = parseFloat(localText.replace(',', '.')) || 0;
      const nextVal = Math.max(min, Math.round((current + delta) * 10) / 10);
      setLocalText(nextVal === 0 && min === 0 ? '' : nextVal.toString());
      onChange(nextVal);
    }
  };

  if (!showSteppers) {
    return (
      <input
        type="text"
        inputMode="decimal"
        value={localText}
        placeholder={placeholder}
        onChange={handleInputChange}
        onBlur={handleBlur}
        className={className}
      />
    );
  }

  const isSmall = size === 'sm';

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => handleStep(-0.5)}
        className={`${
          isSmall ? 'w-6 h-6 text-[10px]' : 'px-2 h-7 text-xs'
        } rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-mono-nums font-bold transition-colors cursor-pointer select-none active:scale-95`}
        title="Disminuir 0.5 Kg"
      >
        {isSmall ? '-' : '-0.5'}
      </button>

      <input
        type="text"
        inputMode="decimal"
        value={localText}
        placeholder={placeholder}
        onChange={handleInputChange}
        onBlur={handleBlur}
        className={
          className ||
          'w-16 px-2 py-1 bg-slate-950/80 border border-slate-700 rounded-lg text-center font-mono-nums text-sm font-semibold text-white focus:border-emerald-500 focus:outline-none'
        }
      />

      <button
        type="button"
        onClick={() => handleStep(0.5)}
        className={`${
          isSmall ? 'w-6 h-6 text-[10px]' : 'px-2 h-7 text-xs'
        } rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-mono-nums font-bold transition-colors cursor-pointer select-none active:scale-95`}
        title="Incrementar 0.5 Kg"
      >
        {isSmall ? '+' : '+0.5'}
      </button>
    </div>
  );
};
