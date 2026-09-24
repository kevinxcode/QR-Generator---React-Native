import { ScrollView, View } from 'react-native';

import { Chip, Input, SectionHeader, SegmentedControl, SwitchRow } from '@/components/ui';
import { CONTENT_TYPES, contentTypeDef } from '@/services/qr/contentTypes';
import { useGenerator } from '@/store/generator.store';
import { spacing } from '@/theme/tokens';

/** Step 1 + 2: choose a content type and fill its dedicated form. */
export function ContentPanel({ errors, lockType }: { errors: Record<string, string>; lockType?: boolean }) {
  const { type, values, setType, setValue } = useGenerator();
  const def = contentTypeDef(type)!;

  return (
    <View style={{ gap: spacing.md }}>
      {!lockType && (
        <>
          <SectionHeader title="Type" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
            {CONTENT_TYPES.map((c) => (
              <Chip key={c.type} label={c.label} icon={c.icon} selected={c.type === type} onPress={() => setType(c.type)} />
            ))}
          </ScrollView>
        </>
      )}
      <SectionHeader title={def.label} />
      {def.fields.map((f) => {
        const v = values[f.key];
        if (f.kind === 'switch') {
          return <SwitchRow key={f.key} title={f.label} subtitle={f.hint} value={!!v} onValueChange={(nv) => setValue(f.key, nv)} />;
        }
        if (f.kind === 'select') {
          return (
            <View key={f.key} style={{ gap: 6 }}>
              <SegmentedControl
                scrollable={f.options.length > 3}
                options={f.options}
                value={String(v ?? f.options[0].value)}
                onChange={(nv) => setValue(f.key, nv)}
                accessibilityLabel={f.label}
              />
            </View>
          );
        }
        if (f.key === 'password' && values.security === 'nopass') return null;
        return (
          <Input
            key={f.key}
            label={f.label}
            placeholder={f.placeholder}
            value={String(v ?? '')}
            onChangeText={(t) => setValue(f.key, t)}
            keyboardType={f.keyboard}
            multiline={f.multiline}
            secure={f.secure}
            autoCapitalize={f.autoCapitalize ?? 'sentences'}
            autoCorrect={!f.keyboard && !f.secure}
            hint={f.hint}
            error={errors[f.key]}
          />
        );
      })}
    </View>
  );
}
