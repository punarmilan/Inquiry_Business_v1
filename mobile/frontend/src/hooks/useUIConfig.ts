import { useContext } from 'react';
import { UIConfigContext } from '../context/UIConfigProvider';

export const useUIConfig = () => useContext(UIConfigContext);
