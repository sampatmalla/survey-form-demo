import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const initialState = {
    progressData: null,
    status: 'idle',
    error: null,
};

export const checkFormProgress = createAsyncThunk(
    'formProgress/checkFormProgress',
    async (progressData, { rejectWithValue }) => {
        try {
            // Destructure the required fields from progressData
            const {
                form_id,
                storeId,
                territory_id,
                region
            } = progressData;

            // Create the payload object
            const payload = {
                form_id: Number(form_id),
                territory_id,
                store_name: storeId,
            };

            const response = await axios.post(
                `https://onehub-python-test-new-dot-onehub-namer-app.uc.r.appspot.com/survey-progress?country_code=${region}`,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-access-token': 'your-secret-api-key',
                    },
                }
            );

            // Return the progress data
            return response.data;
        } catch (err) {
            return rejectWithValue(
                err.response?.data?.message || 'Failed to check form progress'
            );
        }
    }
);

const formProgressSlice = createSlice({
    name: 'formProgress',
    initialState,
    reducers: {
        // Reset the state to initial values
        resetProgress: (state) => {
            state.status = 'idle';
            state.progressData = null;
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(checkFormProgress.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(checkFormProgress.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.progressData = action.payload;
                state.error = null;
            })
            .addCase(checkFormProgress.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload || 'An unknown error occurred';
            });
    },
});

export const { resetProgress } = formProgressSlice.actions;
export default formProgressSlice.reducer;