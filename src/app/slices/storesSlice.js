import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Async thunk for fetching store list
export const fetchStores = createAsyncThunk(
    'stores/fetchStores',
    async ({ territoryId, partner, region }, { rejectWithValue }) => {
        try {
            // Only proceed if required parameters are provided
            if ((!partner || !territoryId) && region !== "IN") {
                return []; // Return empty array if missing parameters and not IN region
            }

            let response;

            if (region === "IN") {
                response = await axios.get(`https://sales-metrics-test-dot-onehub-namer-app.uc.r.appspot.com/Store_Name_${region}/?territory=${encodeURIComponent(territoryId)}`);

                // Handle the specific IN region response format
                if (response.data && response.data["Store Details"] && response.data["Store Details"].length > 0) {
                    return response.data["Store Details"].map(store => ({
                        store_name: store.store_name || '',
                        partner: store.partner || ''
                    }));
                }
                return [];
            }
            else if(region ==="NA"){
                response = await axios.post(`https://onehub-python-test-new-dot-onehub-namer-app.uc.r.appspot.com/getLocations`,
                {
                    "territory": territoryId,
                    "partner": partner,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-access-token': 'your-secret-api-key',
                    },
                }
            );

                const data = response.data.locations;
                if (data.detail) {
                    console.warn("API Response:", data.detail);
                    return []; // Return an empty array for no stores found
                }

                // Extract and return store data
                return data.map((store) => ({
                    store_name: store['location_name'] || store.location_name    || ''
                }));

            }
             else {
                const requestBody = {
                    territory: territoryId,
                    partner: partner,
                };

                response = await axios.post(
                    `https://sales-metrics-test-dot-onehub-namer-app.uc.r.appspot.com/Store_Name_${region}`,
                    requestBody
                );

                const data = response.data;

                // Check if the API returns a "detail" field indicating no data
                if (data.detail) {
                    console.warn("API Response:", data.detail);
                    return []; // Return an empty array for no stores found
                }

                // Extract and return store data
                return data.map((store) => ({
                    store_name: store['Store Name'] || store.store_name || ''
                }));
            }
        } catch (error) {
            console.error("Error fetching stores:", error.message);
            return rejectWithValue(error.message || 'Failed to fetch stores');
        }
    }
);

// Initial state for stores slice
const initialState = {
    stores: [],
    status: 'idle',
    error: null,
    selectedStore: null
};

// Creating the slice
const storesSlice = createSlice({
    name: 'stores',
    initialState,
    reducers: {
        resetStores(state) {
            state.stores = [];
            state.status = 'idle';
            state.error = null;
        },
        setSelectedStoreName(state, action) {
            state.selectedStore = action.payload;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchStores.pending, (state) => {
                state.status = 'loading';
                state.error = null; // Clear any previous errors
            })
            .addCase(fetchStores.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.stores = action.payload;
            })
            .addCase(fetchStores.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload || 'Unknown error occurred';
            });
    },
});

export const { resetStores, setSelectedStoreName } = storesSlice.actions;
export default storesSlice.reducer;