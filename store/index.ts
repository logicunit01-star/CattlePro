import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import tenantReducer from './tenantSlice';

const tenantPersistConfig = {
  key: 'cattleops_tenant',
  storage,
};

const persistedTenantReducer = persistReducer(tenantPersistConfig, tenantReducer);

export const store = configureStore({
  reducer: {
    tenant: persistedTenantReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: { ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'] } }),
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
