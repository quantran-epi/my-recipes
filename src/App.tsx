import './App.css';
import { Provider } from 'react-redux';
import { persistor, store } from '@store/Store';
import { PersistGate } from 'redux-persist/integration/react';
import { RootRouter } from '@routing/RootRouter';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import moment from 'moment';
import 'moment/locale/vi';
import { MessageProvider } from '@components/Message';
import { ModalProvider } from '@components/Modal/ModalProvider';
import { AppInitializer } from '@components/AppInitializer/AppInitializer';

dayjs.locale('vi');
moment.locale('vi');

function App() {
  return (
    <ConfigProvider locale={viVN} theme={{
      token: {
        colorPrimary: "#7436dc",
        colorPrimaryHover: "#8f46f7",
        colorPrimaryActive: "#5e2bbf",
        colorLink: "#7436dc",
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
