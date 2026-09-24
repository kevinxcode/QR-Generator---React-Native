import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, typography } from '@/theme/tokens';

import { IconButton } from './IconButton';
import { Text } from './Text';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  secure?: boolean;
}

export const Input = forwardRef<TextInput, Props>(function Input({ label, error, hint, secure, style, multiline, ...rest }, ref) {
  const p = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secure);
  return (
    <View style={styles.wrap}>
      {label && (
        <Text variant="caption" color="muted" style={styles.label}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.box,
          {
            backgroundColor: p.surfaceAlt,
            borderColor: error ? p.danger : focused ? p.primary : 'transparent',
            minHeight: multiline ? 96 : 48,
          },
        ]}
      >
        <TextInput
          ref={ref}
          placeholderTextColor={p.textFaint}
          accessibilityLabel={label ?? rest.placeholder}
          accessibilityHint={error ?? hint}
          secureTextEntry={hidden}
          multiline={multiline}
          maxFontSizeMultiplier={1.5}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[typography.body, styles.input, { color: p.text, textAlignVertical: multiline ? 'top' : 'center' }, style]}
          {...rest}
        />
        {secure && (
          <IconButton icon={hidden ? 'eye-outline' : 'eye-off-outline'} label={hidden ? 'Show password' : 'Hide password'} onPress={() => setHidden((h) => !h)} size={18} />
        )}
      </View>
      {error ? (
        <View style={styles.row}>
          <Ionicons name="alert-circle" size={14} color={p.danger} />
          <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
            {error}
          </Text>
        </View>
      ) : hint ? (
        <Text variant="caption" color="faint">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

export const SearchInput = forwardRef<TextInput, TextInputProps>(function SearchInput({ value, onChangeText, placeholder = 'Search', ...rest }, ref) {
  const p = useTheme();
  return (
    <View style={[styles.search, { backgroundColor: p.surfaceAlt }]}>
      <Ionicons name="search" size={18} color={p.textFaint} />
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={p.textFaint}
        accessibilityLabel={placeholder}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        maxFontSizeMultiplier={1.5}
        style={[typography.body, { flex: 1, color: p.text, paddingVertical: 10 }]}
        {...rest}
      />
      {!!value && <IconButton icon="close-circle" label="Clear search" size={18} color={p.textFaint} onPress={() => onChangeText?.('')} />}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontWeight: '600' },
  box: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, borderWidth: 1.5, paddingLeft: spacing.sm },
  input: { flex: 1, paddingVertical: 12, paddingRight: spacing.sm },
  row: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radius.md, paddingLeft: spacing.sm, minHeight: 44 },
});
