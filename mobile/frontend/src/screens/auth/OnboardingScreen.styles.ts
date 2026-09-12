import { StyleSheet } from 'react-native';

export const ONBOARDING_COLORS = {
  ink: '#073438',
  body: '#45616A',
  primary: '#026D63',
  button: ['#009B89', '#026D63', '#005D56'] as const,
  paper: '#FCFFFF',
};

export const onboardingStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#E2F8F4' },
  carousel: { flex: 1 },
  page: { height: '100%', alignItems: 'center', paddingVertical: 3 },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    backgroundColor: ONBOARDING_COLORS.paper,
  },
});
