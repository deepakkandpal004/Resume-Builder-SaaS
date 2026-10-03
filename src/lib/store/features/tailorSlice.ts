import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@/lib/config/apiClient";

interface TailorRejectValue {
  message: string;
}

interface TailorState {
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  original: any;
  tailored: any;
  applied: boolean;
}

// Thunk: POST /api/ai/tailor-resume
export const tailorResume = createAsyncThunk<
  any,
  { resumeId: string; jobDescription: string },
  { rejectValue: TailorRejectValue }
>(
  "tailor/generate",
  async ({ resumeId, jobDescription }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/api/ai/tailor-resume",
        { resumeId, jobDescription },
        { timeout: 45000 }
      );
      return response.data;
    } catch (err: any) {
      if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
        return rejectWithValue({ message: "Tailoring timed out. Please try again." });
      }
      return rejectWithValue({
        message: err.response?.data?.message || err.message || "Failed to tailor resume",
      });
    }
  }
);

const initialState: TailorState = {
  status: "idle",
  error: null,
  original: null,
  tailored: null,
  applied: false,
};

const tailorSlice = createSlice({
  name: "tailor",
  initialState,
  reducers: {
    resetTailor: () => initialState,
    markApplied: (state) => {
      state.applied = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(tailorResume.pending, (state) => {
        state.status = "loading";
        state.error = null;
        state.original = null;
        state.tailored = null;
        state.applied = false;
      })
      .addCase(tailorResume.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.original = action.payload.original;
        state.tailored = action.payload.tailored;
      })
      .addCase(tailorResume.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload?.message || "Tailoring failed";
      });
  },
});

export const { resetTailor, markApplied } = tailorSlice.actions;
export default tailorSlice.reducer;
