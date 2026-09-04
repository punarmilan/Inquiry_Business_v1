import type { ImageSourcePropType } from 'react-native';

// Real worker photos already bundled with the website are reused here so the
// provider cards work without depending on external avatar services.
const providerAvatars: Record<string, ImageSourcePropType> = {
  'Raju Kumar': require('../../assets/provider-avatars/teacher.jpg'),
  'Sameer Jadhav': require('../../assets/provider-avatars/plumber.jpg'),
  'Satya More': require('../../assets/provider-avatars/painter.jpg'),
  'Raaj Shinde': require('../../assets/provider-avatars/maid.jpg'),
  'Bharat Pawar': require('../../assets/provider-avatars/loading.jpg'),
  'Vishal Kadam': require('../../assets/provider-avatars/helper.jpg'),
  'Amit Gaikwad': require('../../assets/provider-avatars/driver.jpg'),
  'Nilesh Chavan': require('../../assets/provider-avatars/developer.jpg'),
  'Omkar Bhosale': require('../../assets/provider-avatars/designer.jpg'),
  'Sagar Wagh': require('../../assets/provider-avatars/cook.jpg'),
  'Rahul Mane': require('../../assets/provider-avatars/construction.jpg'),
  'Kiran Jagtap': require('../../assets/provider-avatars/cleaning.jpg'),
  'Pratik Shelar': require('../../assets/provider-avatars/carpenter.jpg'),
  'Mahesh Thorat': require('../../assets/provider-avatars/baby-sitter.jpg'),
  'Tejas Dhumal': require('../../assets/provider-avatars/accountant.jpg'),
};

export const getProviderAvatar = (name?: string) => (name ? providerAvatars[name] : undefined);
