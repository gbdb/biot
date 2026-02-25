import { View, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';

export type ActionItem = {
  icon: keyof typeof Ionicons.glyphMap;
  href?: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
};

type ActionToolbarProps = {
  actions: ActionItem[];
};

export function ActionToolbar({ actions }: ActionToolbarProps) {
  const { width: screenWidth } = useWindowDimensions();
  const btnSize = Math.max(72, (screenWidth - 48 - (actions.length - 1) * 12) / actions.length);

  return (
    <View style={styles.toolbar}>
      {actions.map((action, i) => {
        const btnStyle = [
          styles.btn,
          { width: btnSize, height: btnSize },
          action.variant === 'primary' ? styles.btnPrimary : styles.btnSecondary,
        ];
        const iconColor = action.variant === 'primary' ? '#fff' : '#1a3c27';

        if (action.href) {
          return (
            <Link key={i} href={action.href} asChild>
              <TouchableOpacity
                style={btnStyle}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name={action.icon} size={40} color={iconColor} />
              </TouchableOpacity>
            </Link>
          );
        }

        return (
          <TouchableOpacity
            key={i}
            style={btnStyle}
            onPress={action.onPress}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name={action.icon} size={40} color={iconColor} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#4a6741',
    borderTopWidth: 2,
    borderTopColor: '#1a3c27',
  },
  btn: {
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1a3c27',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  btnPrimary: {
    backgroundColor: '#1a3c27',
    borderColor: '#0f2a1d',
  },
  btnSecondary: {
    backgroundColor: '#fff',
    borderColor: '#1a3c27',
  },
});
