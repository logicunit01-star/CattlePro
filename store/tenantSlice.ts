import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface TenantState {
  companyName: string | null;
  instanceId: string | null;
  appType: string | null;
}

const initialState: TenantState = {
  companyName: null,
  instanceId: null,
  appType: null,
};

const tenantSlice = createSlice({
  name: 'tenant',
  initialState,
  reducers: {
    setTenant: (state, action: PayloadAction<Partial<TenantState>>) => {
      if (action.payload.companyName !== undefined) state.companyName = action.payload.companyName;
      if (action.payload.instanceId !== undefined) state.instanceId = action.payload.instanceId;
      if (action.payload.appType !== undefined) state.appType = action.payload.appType;
    },
    clearTenant: (state) => {
      state.companyName = null;
      state.instanceId = null;
      state.appType = null;
    },
  },
});

export const { setTenant, clearTenant } = tenantSlice.actions;
export default tenantSlice.reducer;
