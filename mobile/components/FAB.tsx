import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type FABProps = {
  onPress: () => void;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'secondary' | 'danger' | 'neutral';
  size?: 'medium' | 'large';
  disabled?: boolean;
  style?: ViewStyle;
};

export function FAB({
  onPress,
  label,
  icon,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  style,
}: FABProps) {
  const isLarge = size === 'large';
  const iconSize = isLarge ? 26 : 22;

  return (
    <TouchableOpacity
      style={[
        styles.fab,
        isLarge ? styles.fabLarge : styles.fabMedium,
        variant === 'primary' && styles.fabPrimary,
        variant === 'secondary' && styles.fabSecondary,
        variant === 'danger' && styles.fabDanger,
        variant === 'neutral' && styles.fabNeutral,
        disabled && styles.fabDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={iconSize}
          color={variant === 'secondary' || variant === 'neutral' ? '#1a3c27' : '#fff'}
        />
      )}
      <Text
        style={[
          styles.label,
          isLarge && styles.labelLarge,
          (variant === 'secondary' || variant === 'neutral') ? styles.labelDark : styles.labelLight,
          disabled && styles.labelDisabled,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabMedium: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 56,
  },
  fabLarge: {
    paddingVertical: 18,
    paddingHorizontal: 28,
    minHeight: 64,
  },
  fabPrimary: {
    backgroundColor: '#1a3c27',
  },
  fabSecondary: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#1a3c27',
  },
  fabDanger: {
    backgroundColor: '#c44',
  },
  fabNeutral: {
    backgroundColor: '#5a6c5e',
  },
  fabDisabled: {
    opacity: 0.6,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  labelLarge: {
    fontSize: 18,
  },
  labelLight: {
    color: '#fff',
  },
  labelDark: {
    color: '#1a3c27',
  },
  labelDisabled: {
    color: '#888',
  },
});
