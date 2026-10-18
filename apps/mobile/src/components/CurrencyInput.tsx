import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity } from 'react-native';
import { theme } from '../constants/theme';

export type CurrencyUnit = 'Lakhs' | 'Crores';

interface CurrencyInputProps {
  label: string;
  value: number | null;
  onChangeValue: (val: number | null) => void;
  defaultUnit?: CurrencyUnit;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  label,
  value,
  onChangeValue,
  defaultUnit = 'Lakhs',
}) => {
  const [unit, setUnit] = useState<CurrencyUnit>(defaultUnit);
  const [localText, setLocalText] = useState<string>('');
  const [isFocused, setIsFocused] = useState(false);

  // Synchronize localText with external value changes (except when user is actively typing)
  useEffect(() => {
    if (!isFocused && value !== null && value !== undefined) {
      const displayVal = value / (unit === 'Lakhs' ? 100000 : 10000000);
      const displayStr = parseFloat(displayVal.toFixed(2)).toString();
      if (displayStr !== localText) {
        setLocalText(displayStr);
      }
    } else if (!isFocused && (value === null || value === undefined)) {
      setLocalText('');
    }
  }, [value, unit, isFocused]);

  const calculateAbsolute = (textVal: string, activeUnit: CurrencyUnit) => {
    if (!textVal) {
      onChangeValue(null);
      return;
    }
    
    const parsed = parseFloat(textVal);
    if (isNaN(parsed)) {
      onChangeValue(null);
      return;
    }

    const multiplier = activeUnit === 'Lakhs' ? 100000 : 10000000;
    const absoluteInteger = Math.round(parsed * multiplier);
    onChangeValue(absoluteInteger);
  };

  const handleTextChange = (text: string) => {
    // 1. Regex: Strip all non-numeric and non-decimal characters
    let cleaned = text.replace(/[^0-9.]/g, '');

    // 2. Prevent multiple decimals
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }

    setLocalText(cleaned);
    calculateAbsolute(cleaned, unit);
  };

  const toggleUnit = (selectedUnit: CurrencyUnit) => {
    setUnit(selectedUnit);
    calculateAbsolute(localText, selectedUnit);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.pillContainer}>
          <TouchableOpacity
            style={[styles.pillButton, unit === 'Lakhs' && styles.pillActive]}
            activeOpacity={0.7}
            onPress={() => toggleUnit('Lakhs')}
          >
            <Text style={[styles.pillText, unit === 'Lakhs' && styles.pillTextActive]}>Lakhs</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pillButton, unit === 'Crores' && styles.pillActive]}
            activeOpacity={0.7}
            onPress={() => toggleUnit('Crores')}
          >
            <Text style={[styles.pillText, unit === 'Crores' && styles.pillTextActive]}>Crores</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.inputWrapper, isFocused && styles.inputWrapperFocused]}>
        <Text style={styles.currencyPrefix}>₹</Text>
        <TextInput
          style={styles.input}
          value={localText}
          onChangeText={handleTextChange}
          keyboardType="numeric"
          placeholder="0.00"
          placeholderTextColor="#475569"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.darkTextMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  pillContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  pillActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  pillText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748B',
  },
  pillTextActive: {
    color: '#0F172A',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  inputWrapperFocused: {
    borderColor: '#0F172A',
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  currencyPrefix: {
    fontSize: 16,
    color: '#64748B',
    marginRight: 8,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '500',
  },
});
