import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AuthState {
  user: any;
  loading: boolean;
}

const initialState: AuthState = {
  user: null,
  loading: true,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<any>) => {
      state.user = action.payload;
      state.loading = false;
    },

    logout: (state) => {
      state.user = null;
      state.loading = false;
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    setPremium: (state) => {
      if (state.user) {
        state.user = { ...state.user, subscriptionTier: "premium" };
      }
    },
  },
});

export const { setUser, logout, setLoading, setPremium } = authSlice.actions;
export default authSlice.reducer;
