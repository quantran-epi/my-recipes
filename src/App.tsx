import './App.css';
import { Provider } from 'react-redux';
import { persistor, store } from '@store/Store';
import { PersistGate } from 'redux-persist/integration/react';
import { RootRouter } from '@routing/RootRouter';
import { ConfigProvider } from 'antd';
import { MessageProvider } from '@components/Message';
import { ModalProvider } from '@components/Modal/ModalProvider';
import { AppInitializer } from '@components/AppInitializer/AppInitializer';

function App() {
  return (
    <ConfigProvider theme={{
      token: {
        colorPrimary: "rgb(245, 130, 32)",
        colorLink: "#3d4195",
        colorBorderSecondary: "#d9d9d9",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
        fontSize: 18,
        zIndexPopupBase: 4000,
      },
      components: {
        DatePicker: { zIndexPopup: 4200 },
        Dropdown: { zIndexPopup: 4200 },
        Menu: { zIndexPopup: 4200 },
        Popover: { zIndexPopup: 4200 },
        Select: { zIndexPopup: 4200 },
        Tooltip: { zIndexPopup: 4200 },
      },
    }}>

      <MessageProvider>
        <ModalProvider>
          <Provider store={store}>
            <PersistGate loading={null} persistor={persistor}>
              <AppInitializer>
                <RootRouter />
              </AppInitializer>
            </PersistGate>
          </Provider>
        </ModalProvider>
      </MessageProvider>
    </ConfigProvider>
  );
}

export default App;
