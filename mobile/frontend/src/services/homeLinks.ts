import { Alert, Linking } from 'react-native';
import { validHomeLink } from '../utils/uiHomeHeader';

export async function openHomeLink(url: unknown, language: 'en' | 'hi' = 'en') {
  if (!validHomeLink(url)) return false;
  try { await Linking.openURL(url); return true; }
  catch {
    Alert.alert(language === 'hi' ? 'लिंक नहीं खुला' : 'Could not open link', language === 'hi' ? 'कृपया अपना इंटरनेट कनेक्शन जाँचें और फिर कोशिश करें।' : 'Check your internet connection and try again.');
    return false;
  }
}
