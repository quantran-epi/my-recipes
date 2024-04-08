import './App.css';
import { Provider } from 'react-redux';
import { persistor, store } from '@store/Store';
import { PersistGate } from 'redux-persist/integration/react';
import { RootRouter } from '@routing/RootRouter';

function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <RootRouter />
      </PersistGate>
    </Provider>
  );
}

export default App;
