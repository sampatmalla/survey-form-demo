import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const initialState = {
    completionResult: null,
    status: 'idle',
    error: null,
};

export const completeSession = createAsyncThunk(
    'sessionCompletion/completeSession',
    async (sessionData, { rejectWithValue }) => {
        try {
            // Destructure the required fields from sessionData
            const {
                form_id,
                territory_id, 
                storeId,
                region,
                session_id,
            } = sessionData;

            // Create the payload object
            const payload = {
                form_id: Number(form_id),
                territory_id, 
                store_name: storeId,
                app_session_id : session_id,
            };

            const response = await axios.post(
                `https://onehub-python-test-new-dot-onehub-namer-app.uc.r.appspot.com/session-completion?country_code=${region}`,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-access-token': 'your-secret-api-key',
                    },
                }
            );

            // Return the completion result
            return response.data;
        } catch (err) {
            return rejectWithValue(
                err.response?.data?.message || 'Failed to complete session'
            );
        }
    }
);

const sessionCompletionSlice = createSlice({
    name: 'sessionCompletion',
    initialState,
    reducers: {
        // Reset the state to initial values
        resetCompletion: (state) => {
            state.status = 'idle';
            state.completionResult = null;
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(completeSession.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(completeSession.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.completionResult = action.payload;
                state.error = null;
            })
            .addCase(completeSession.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload || 'An unknown error occurred';
            });
    },
});

export const { resetCompletion } = sessionCompletionSlice.actions;
export default sessionCompletionSlice.reducer;