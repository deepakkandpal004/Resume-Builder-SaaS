import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/config/apiClient";

interface CoverLetterRejectValue {
  message: string;
  quotaExhausted?: boolean;
}

interface CoverLetter {
  letterId?: string;
  content?: string;
  companyName?: string;
  positionTitle?: string;
  tone?: string;
  createdAt?: string;
}

interface CoverLetterState {
  genStatus: "idle" | "loading" | "succeeded" | "failed";
  historyStatus: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  quotaExhausted: boolean;
  lettersRemainingToday: number | null;
  current: CoverLetter | null;
  history: CoverLetter[];
}

// Thunk: POST /api/ai/generate-cover-letter
export const generateCoverLetter = createAsyncThunk<
  any,
  { resumeId: string; jobDescription: string; companyName?: string; positionTitle?: string; tone?: string },
  { rejectValue: CoverLetterRejectValue }
>(
  "coverLetter/generate",
  async ({ resumeId, jobDescription, companyName, positionTitle, tone }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/api/ai/generate-cover-letter",
        { resumeId, jobDescription, companyName, positionTitle, tone },
        { timeout: 35000 }
      );
      return response.data;
    } catch (err: any) {
      if (err.response?.status === 429) {
        return rejectWithValue({
          message: "Daily cover letter limit reached.",
          quotaExhausted: true,
        });
      }
      if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
        return rejectWithValue({
          message: "Generation timed out. Please try again.",
        });
      }
      return rejectWithValue({
        message: err.response?.data?.message || err.message || "Generation failed",
      });
    }
  }
);

// Thunk: GET /api/ai/cover-letter/history/:resumeId
export const fetchCoverLetters = createAsyncThunk<
  any,
  string,
  { rejectValue: CoverLetterRejectValue }
>(
  "coverLetter/fetch",
  async (resumeId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/ai/cover-letter/history/${resumeId}`);
      return response.data;
    } catch (err: any) {
      return rejectWithValue({
        message: err.response?.data?.message || err.message || "Failed to load cover letters",
      });
    }
  }
);

// Thunk: DELETE /api/ai/cover-letter/delete/:letterId
export const deleteCoverLetter = createAsyncThunk<
  { letterId: string },
  string,
  { rejectValue: CoverLetterRejectValue }
>(
  "coverLetter/delete",
  async (letterId, { rejectWithValue }) => {
    try {
      await api.delete(`/api/ai/cover-letter/delete/${letterId}`);
      return { letterId };
    } catch (err: any) {
      return rejectWithValue({
        message: err.response?.data?.message || err.message || "Failed to delete cover letter",
      });
    }
  }
);

const initialState: CoverLetterState = {
  genStatus: "idle",
  historyStatus: "idle",
  error: null,
  quotaExhausted: false,
  lettersRemainingToday: null,
  current: null,
  history: [],
};

const coverLetterSlice = createSlice({
  name: "coverLetter",
  initialState,
  reducers: {
    resetCoverLetter: () => initialState,
    selectLetter: (state, action: PayloadAction<any>) => {
      state.current = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(generateCoverLetter.pending, (state) => {
        state.genStatus = "loading";
        state.error = null;
      })
      .addCase(generateCoverLetter.fulfilled, (state, action) => {
        const {
          coverLetterId,
          content,
          companyName,
          positionTitle,
          tone,
          createdAt,
          lettersRemainingToday,
        } = action.payload;

        state.genStatus = "succeeded";
        state.quotaExhausted = false;
        state.lettersRemainingToday = lettersRemainingToday ?? state.lettersRemainingToday;

        const letter: CoverLetter = {
          letterId: coverLetterId,
          content,
          companyName,
          positionTitle,
          tone,
          createdAt: createdAt || new Date().toISOString(),
        };
        state.current = letter;
        state.history = [letter, ...state.history];
      })
      .addCase(generateCoverLetter.rejected, (state, action) => {
        state.genStatus = "failed";
        state.error = action.payload?.message || "Generation failed";
        if (action.payload?.quotaExhausted) {
          state.quotaExhausted = true;
        }
      })
      .addCase(fetchCoverLetters.pending, (state) => {
        state.historyStatus = "loading";
        state.error = null;
      })
      .addCase(fetchCoverLetters.fulfilled, (state, action) => {
        state.historyStatus = "idle";
        state.history = action.payload.letters;
      })
      .addCase(fetchCoverLetters.rejected, (state, action) => {
        state.historyStatus = "failed";
        state.error = action.payload?.message || "Failed to load cover letters";
      })
      .addCase(deleteCoverLetter.fulfilled, (state, action) => {
        const { letterId } = action.payload;
        state.history = state.history.filter((l) => l.letterId !== letterId);
        if (state.current?.letterId === letterId) {
          state.current = null;
        }
      })
      .addCase(deleteCoverLetter.rejected, (state, action) => {
        state.error = action.payload?.message || "Failed to delete cover letter";
      });
  },
});

export const { resetCoverLetter, selectLetter } = coverLetterSlice.actions;

export default coverLetterSlice.reducer;
