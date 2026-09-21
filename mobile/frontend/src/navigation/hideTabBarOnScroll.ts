import { Animated } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

// Shared across every screen so the bottom tab bar reacts the same way no
// matter which tab/list the user is scrolling.
const tabBarShift = new Animated.Value(0);

let tabBarHeight = 90;
let hidden = false;
let lastOffsetY = 0;

const DOWN_THRESHOLD = 4;
const UP_THRESHOLD = 2;

function animateTo(shouldHide: boolean) {
  if (hidden === shouldHide) return;
  hidden = shouldHide;
  Animated.timing(tabBarShift, {
    toValue: shouldHide ? tabBarHeight : 0,
    duration: 180,
    useNativeDriver: true,
  }).start();
}

export function setTabBarHeight(height: number) {
  tabBarHeight = height;
  if (hidden) {
    tabBarShift.setValue(height);
  }
}

export function showTabBar() {
  animateTo(false);
}

export const tabBarTranslateY = tabBarShift;

export function handleTabBarScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
  const y = event.nativeEvent.contentOffset.y;
  const delta = y - lastOffsetY;
  lastOffsetY = y;

  if (y <= 0) {
    animateTo(false);
    return;
  }
  if (delta > DOWN_THRESHOLD) {
    animateTo(true);
  } else if (delta < -UP_THRESHOLD) {
    animateTo(false);
  }
}

// Spread this onto any ScrollView/FlatList that scrolls under the tab bar.
export const tabBarScrollProps = {
  onScroll: handleTabBarScroll,
  scrollEventThrottle: 16,
};
