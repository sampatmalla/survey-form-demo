import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const initialState = {
    submissionResult: null,
    status: 'idle',
    error: null,
};

export const submitImeiInventory = createAsyncThunk(
    'imeiInventory/submitImeiInventory',
    async ({ payload, region }, { rejectWithValue }) => {
        try {
            // Destructure the required fields from surveyData

            const response = await axios.post(
                `https://onehub-python-test-new-dot-onehub-namer-app.uc.r.appspot.com/add-to-inventory?country_code=${region}`,
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

const imeiInventorySlice = createSlice({
    name: 'imeiInventory',
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
            .addCase(submitImeiInventory.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(submitImeiInventory.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.submissionResult = action.payload;
                state.error = null;
            })
            .addCase(submitImeiInventory.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload || 'An unknown error occurred';
            });
    },
});

export const { resetSubmission } = imeiInventorySlice.actions;
export default imeiInventorySlice.reducer;