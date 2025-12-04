import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {ThemeProvider} from './context/ThemeContext';
import AppNavigator from './navigation/AppNavigator';

const queryClient = new QueryClient();

function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;

