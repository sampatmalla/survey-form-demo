import { configureStore } from '@reduxjs/toolkit'
import surveyFormReducer from './slices/surveyFormSlice'
import surveyResponsesReducer from './slices/surveyResponsesSlice'
import formProgressReducer from './slices/formProgressSlice'
import sessionCompletionReducer from './slices/sessionCompletionSlice'
import imeiInventoryReducer from './slices/imeiInventorySlice'
import imeiSalesReducer from './slices/imeiSalesSlice'
import storesReducer from './slices/storesSlice'

export default configureStore({
    reducer: {
        surveyForm: surveyFormReducer,
        surveyResponses: surveyResponsesReducer,
        formProgress: formProgressReducer,
        sessionCompletion: sessionCompletionReducer,
        imeiInventory: imeiInventoryReducer,
        imeiSales: imeiSalesReducer,
        stores: storesReducer,
    },
}); 