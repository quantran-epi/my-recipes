import './App.css';
import { Provider } from 'react-redux';
import { persistor, store } from '@store/Store';
import { PersistGate } from 'redux-persist/integration/react';
import { RootRouter } from '@routing/RootRouter';
import { ConfigProvider, theme } from 'antd';
import { MessageProvider } from '@components/Message';
import { ModalProvider } from '@components/Modal/ModalProvider';

function App() {
  return (
    <ConfigProvider theme={{
      token: {
        colorPrimary: "rgb(245, 130, 32)",
        colorLink: "#3d4195",
        colorBorderSecondary: "#d9d9d9",
        fontSize: 18
      },
    }}>

      <MessageProvider>
        <ModalProvider>
          <Provider store={store}>
            <PersistGate loading={null} persistor={persistor}>
              <RootRouter />
            </PersistGate>
          </Provider>
        </ModalProvider>
      </MessageProvider>
    </ConfigProvider>
  );
}

export default App;
