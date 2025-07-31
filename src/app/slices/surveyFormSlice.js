import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const initialState = {
  surveyForm: null,
  allSurveyForms: [],
  status: "idle",
  allFormsStatus: "idle",
  error: null,
  allFormsError: null,
  sessionLogStatus: 'idle',
  sessionLogError: null,
  sessionLogResponse: null,
};

export const fetchSurveyForm = createAsyncThunk(
  "surveyForm/fetchSurveyForm",
  async ({ formId, region }, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `https://cms-global-backend-test-dot-onehub-namer-app.uc.r.appspot.com/completedatafetcher/Test%20Survey%20Question%20Forms/${formId}?region=${region}`,
        {
          headers: {
            "X-access-token": "this-is-a-privileged-api-key",
          },
        }
      );
      // Return the survey form data
      const formData = response.data[`Test Survey Question Forms/${formId}`];
      return formData;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch survey data"
      );
    }
  }
);

export const fetchAllSurveyForms = createAsyncThunk(
  "surveyForm/fetchAllSurveyForms",
  async (region, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `https://cms-global-backend-test-dot-onehub-namer-app.uc.r.appspot.com/getSingleLevelOfDepth/Test%20Survey%20Question%20Forms?region=${region}`,
        {
          headers: {
            "X-access-token": "this-is-a-privileged-api-key",
          },
        }
      );
      // Return all survey forms data
      return response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch all survey forms"
      );
    }
  }
);

export const logSurveySession = createAsyncThunk(
  "surveyForm/logSurveySession",
  async ({ territoryId }, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `https://onehub-python-test-new-dot-onehub-namer-app.uc.r.appspot.com/survey_session_logger_record?country_code=IN`,
        {
          territory_id: territoryId,
        },
        {
          headers: {
            "X-access-token": "your-secret-api-key",
          },
        }
      );
      return response.data; 
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to log survey session"
      );
    }
  }
);

const surveyFormSlice = createSlice({
  name: "surveyForm",
  initialState,
  reducers: {
    // Add any additional reducers if needed
    resetSurveyForm: (state) => {
      state.status = "idle";
      state.error = null;
    },
    resetAllSurveyForms: (state) => {
      state.allFormsStatus = "idle";
      state.allFormsError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Single survey form cases
      .addCase(fetchSurveyForm.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchSurveyForm.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.surveyForm = action.payload;
        state.error = null;
      })
      .addCase(fetchSurveyForm.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "An unknown error occurred";
      })

      // All survey forms cases
      .addCase(fetchAllSurveyForms.pending, (state) => {
        state.allFormsStatus = "loading";
        state.allFormsError = null;
      })
      .addCase(fetchAllSurveyForms.fulfilled, (state, action) => {
        state.allFormsStatus = "succeeded";
        state.allSurveyForms = action.payload;
        state.allFormsError = null;
      })
      .addCase(fetchAllSurveyForms.rejected, (state, action) => {
        state.allFormsStatus = "failed";
        state.allFormsError = action.payload || "An unknown error occurred";
      })

      //for record
      .addCase(logSurveySession.pending, (state) => {
        state.sessionLogStatus = "loading";
      })
      .addCase(logSurveySession.fulfilled, (state, action) => {
        state.sessionLogStatus = "succeeded";
        state.sessionLogResponse = action.payload;
      })
      .addCase(logSurveySession.rejected, (state, action) => {
        state.sessionLogStatus = "failed";
        state.sessionLogError = action.payload;
      });
  },
});

export const { resetSurveyForm, resetAllSurveyForms } = surveyFormSlice.actions;
export default surveyFormSlice.reducer;
