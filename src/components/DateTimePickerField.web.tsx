import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

interface DateTimePickerFieldProps {
  value: string;
  onChange: (v: string) => void;
  mode?: 'date' | 'datetime';
}

export default function DateTimePickerField({
  value,
  onChange,
  mode = 'date',
}: Readonly<DateTimePickerFieldProps>) {
  const theme = useTheme();
  const inputType = mode === 'datetime' ? 'datetime-local' : 'date';
  const normalizedValue = mode === 'datetime' ? value.slice(0, 16) : value.slice(0, 10);

  return (
    <View>
      {/* @ts-ignore — HTML <input> is valid in React Native Web .web.tsx files */}
      <input
        type={inputType}
        value={normalizedValue}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        style={{
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: theme.border,
          backgroundColor: theme.backgroundElement,
          color: theme.text,
          borderRadius: 8,
          padding: '10px 12px',
          fontSize: 14,
          width: '100%',
          boxSizing: 'border-box',
          fontFamily: 'inherit',
          outline: 'none',
        } as React.CSSProperties}
      />
    </View>
  );
}
