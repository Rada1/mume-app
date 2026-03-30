import { useContext } from 'react';
import { MapperContext } from './MapperContext';

export const useMapper = () => {
    const context = useContext(MapperContext);
    if (!context) throw new Error('useMapper must be used within a MapperProvider');
    return context;
};
