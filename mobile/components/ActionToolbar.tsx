import { View, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';

export type ActionItem = {
  icon: keyof typeof Ionicons.glyphMap;
  href?: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
};

const FAB_SIZE = 64;

type ActionToolbarProps = {
  actions: ActionItem[];
};

export function ActionToolbar({ actions }: ActionToolbarProps) {
  return (
    <View style={styles.toolbar}>
      {actions.map((action, i) => {
        const isPrimary = action.variant === 'primary';
        const btnStyle = [
          styles.fab,
          isPrimary ? styles.fabPrimary : styles.fabSecondary,
        ];
        const iconColor = isPrimary ? '#fff' : '#1a3c27';

        if (action.href) {
          return (
            <Link key={i} href={action.href} asChild>
              <TouchableOpacity
                style={btnStyle}
                activeOpacity={0.85}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name={action.icon} size={28} color={iconColor} />
              </TouchableOpacity>
            </Link>
          );
        }

        return (
          <TouchableOpacity
            key={i}
            style={btnStyle}
            onPress={action.onPress}
            activeOpacity={0.85}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name={action.icon} size={28} color={iconColor} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabPrimary: {
    backgroundColor: '#1a3c27',
  },
  fabSecondary: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#1a3c27',
  },
});
