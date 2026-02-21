import React, { createContext, useContext, useState } from 'react';

const FocusModeContext = createContext(null);

export function FocusModeProvider({ children }) {
  const [focusMode, setFocusMode] = useState('map'); // 'map' | 'operation' | 'comms'

  return (
    <FocusModeContext.Provider value={{ focusMode, setFocusMode }}>
      {children}
    </FocusModeContext.Provider>
  );
}

export function useFocusMode() {
  const context = useContext(FocusModeContext);
  if (!context) {
    throw new Error('useFocusMode must be used within FocusModeProvider');
  }
  return context;
}