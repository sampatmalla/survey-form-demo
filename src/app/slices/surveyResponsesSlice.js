import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const initialState = {
    submissionResult: null,
    status: 'idle',
    error: null,
};

export const submitSurveyResponses = createAsyncThunk(
    'surveyResponses/submitSurveyResponses',
    async ({ surveyData, region }, { rejectWithValue }) => {
        try {
            // Destructure the required fields from surveyData
            const {
                form_id,
                session_id,
                store_name,
                territory_id,
                questions_submitted,
                questions_removed,
                type
            } = surveyData;

            // Create the payload object
            const payload = {
                form_id: Number(form_id),
                app_session_id: session_id,
                territory_id,
                questions_submitted,
                store_name
            };

            // Only add questions_removed if it exists and has items
            if (questions_removed && questions_removed.length > 0) {
                payload.questions_removed = questions_removed;
            }

            // Only add type if it exists
            if (type && type !== 'undefined' && type !== 'null') {
                payload.type = type;
            } 
            
            const response = await axios.post(
                `https://onehub-python-test-new-dot-onehub-namer-app.uc.r.appspot.com/publish-survey-responses?country_code=${region}`,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-access-token': 'your-secret-api-key',
                    },
                }
            );

            // Return the submission result
            return response.data;
        } catch (err) {
            return rejectWithValue(
                err.response?.data?.message || 'Failed to submit survey responses'
            );
        }
    }
);

const surveyResponsesSlice = createSlice({
    name: 'surveyResponses',
    initialState,
    reducers: {
        // Reset the state to initial values
        resetSubmission: (state) => {
            state.status = 'idle';
            state.submissionResult = null;
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(submitSurveyResponses.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(submitSurveyResponses.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.submissionResult = action.payload;
                state.error = null;
            })
            .addCase(submitSurveyResponses.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload || 'An unknown error occurred';
            });
    },
});

export const { resetSubmission } = surveyResponsesSlice.actions;
export default surveyResponsesSlice.reducer;