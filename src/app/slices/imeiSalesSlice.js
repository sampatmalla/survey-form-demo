import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const initialState = {
    submissionResult: null,
    status: 'idle',
    error: null,
};

export const getImeiSales = createAsyncThunk(
    'imeiSales/getImeiSales',
    async ({ payload, region }, { rejectWithValue }) => {
        try {
            // Destructure the required fields from surveyData
            const response = await axios.post(
                `https://onehub-python-test-new-dot-onehub-namer-app.uc.r.appspot.com/get-imei?country_code=${region}`,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-access-token': 'your-secret-api-key',
                    },
                }
            );
            // Return the submission result
            return response?.data;
        } catch (err) {
            return rejectWithValue(
                err.response?.data?.detail || 'Failed to submit survey responses'
            );
        }
    }
);

const imeiSalesSlice = createSlice({
    name: 'imeiSales',
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
            .addCase(getImeiSales.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(getImeiSales.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.submissionResult = action.payload;
                state.error = null;
            })
            .addCase(getImeiSales.rejected, (state, action) => {
                state.status = 'failed';
                state.submissionResult = [];
                state.error = action.payload || 'An unknown error occurred';
            });
    },
});

export const { resetSubmission } = imeiSalesSlice.actions;
export default imeiSalesSlice.reducer;