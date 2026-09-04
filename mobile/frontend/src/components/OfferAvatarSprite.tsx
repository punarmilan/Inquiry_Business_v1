import React from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { OfferAvatar } from '../config/offerCardDesigner';

export const OfferAvatarSprite: React.FC<{
  avatar: OfferAvatar;
  size: number;
  style?: StyleProp<ViewStyle>;
}> = ({ avatar, size, style }) => (
  <View style={[styles.clip, { width: size, height: size }, style]} pointerEvents="none">
    <Image
      source={avatar.source}
      resizeMode="stretch"
      style={[
        styles.sheet,
        {
          width: size * 2,
          height: size * 2,
          left: avatar.column * -size,
          top: avatar.row * -size,
        },
      ]}
    />
  </View>
);

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  sheet: { position: 'absolute' },
});
