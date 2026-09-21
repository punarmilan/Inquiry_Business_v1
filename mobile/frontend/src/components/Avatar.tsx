import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, createThemedStyles } from '../theme';

interface AvatarProps {
  uri?: string;
  name?: string;
  size?: number;
  verified?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({ uri, name, size = 44, verified }) => {
  const initials = (name ?? '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View style={{ width: size, height: size }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        >
          <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials}</Text>
        </View>
      )}
      {verified && (
        <View style={[styles.badge, { right: -2, bottom: -2 }]}>
          <MaterialCommunityIcons name="check-decagram" size={size * 0.38} color={theme.colors.verified} />
        </View>
      )}
    </View>
  );
};

const styles = createThemedStyles((c) => ({
  image: {
    backgroundColor: c.surfaceAlt,
  },
  fallback: {
    backgroundColor: c.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: c.primaryDark,
    fontWeight: '800',
  },
  badge: {
    position: 'absolute',
    backgroundColor: c.surface,
    borderRadius: 999,
  },
}));
