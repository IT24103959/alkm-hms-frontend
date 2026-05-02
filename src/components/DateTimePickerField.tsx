import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import RNDateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { useTheme } from '@/hooks/use-theme';

// ── Helpers ───────────────────────────────────────────────────────────────────

function toIso(date: Date, mode: 'date' | 'datetime'): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  if (mode === 'date') {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseDate(value: string): Date {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function formatDisplay(value: string, mode: 'date' | 'datetime'): string {
  if (!value) return 'Select…';
  const d = parseDate(value);
  if (mode === 'date') {
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

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
  const [show, setShow] = useState(false);
  const [androidPhase, setAndroidPhase] = useState<'date' | 'time'>('date');
  const [pendingDate, setPendingDate] = useState<Date | null>(null);

  const currentDate = value ? parseDate(value) : new Date();

  const handlePress = () => {
    setAndroidPhase('date');
    setPendingDate(new Date(currentDate));
    setShow(true);
  };

  const handleChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (!selected) {
      setShow(false);
      return;
    }

    if (Platform.OS === 'android') {
      if (mode === 'datetime' && androidPhase === 'date') {
        setPendingDate(selected);
        setAndroidPhase('time');
        return; // stay open — Android will show time picker next
      }
      setShow(false);
      if (mode === 'datetime' && pendingDate) {
        const merged = new Date(pendingDate);
        merged.setHours(selected.getHours(), selected.getMinutes());
        onChange(toIso(merged, 'datetime'));
      } else {
        onChange(toIso(selected, mode));
      }
    } else {
      // iOS: live updates, Done button closes
      onChange(toIso(selected, mode));
    }
  };

  let pickerMode: 'date' | 'time' | 'datetime' = mode === 'datetime' ? 'datetime' : 'date';
  if (Platform.OS === 'android' && mode === 'datetime') {
    pickerMode = androidPhase;
  }

  return (
    <View>
      <Pressable
        style={[styles.button, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
        onPress={handlePress}>
        <Text style={[styles.buttonText, { color: value ? theme.text : theme.textSecondary }]}>
          {formatDisplay(value, mode)}
        </Text>
        <Text style={{ color: theme.textSecondary, fontSize: 16 }}>📅</Text>
      </Pressable>

      {/* iOS — bottom sheet spinner */}
      {Platform.OS === 'ios' && show && (
        <Modal transparent animationType="slide" onRequestClose={() => setShow(false)}>
          <View style={styles.iosOverlay}>
            <View style={[styles.iosSheet, { backgroundColor: theme.card }]}>
              <Pressable onPress={() => setShow(false)} style={styles.iosDoneRow}>
                <Text style={[styles.iosDoneText, { color: theme.primary }]}>Done</Text>
              </Pressable>
              <RNDateTimePicker
                value={currentDate}
                mode={mode === 'datetime' ? 'datetime' : 'date'}
                display="spinner"
                onChange={handleChange}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Android — native dialog */}
      {Platform.OS === 'android' && show && (
        <RNDateTimePicker
          value={androidPhase === 'time' && pendingDate ? pendingDate : currentDate}
          mode={pickerMode}
          display="default"
          onChange={handleChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  buttonText: { fontSize: 14 },
  iosOverlay: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'flex-end',
  },
  iosSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  iosDoneRow: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iosDoneText: { fontSize: 16, fontWeight: '600' },
});
