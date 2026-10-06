import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import { combineReducers } from '@reduxjs/toolkit';
import authReducer from './features/authSlice';
import atsReducer from './features/atsSlice';
import coverLetterReducer from './features/coverLetterSlice';
import interviewReducer from './features/interviewSlice';
import tailorReducer from './features/tailorSlice';
import resumeScoreReducer from './features/resumeScoreSlice';
const rootReducer = combineReducers({
    auth: authReducer,
    ats: atsReducer,
    coverLetter: coverLetterReducer,
    interview: interviewReducer,
    tailor: tailorReducer,
    resumeScore: resumeScoreReducer,
});
export function makeStore() {
    const persistConfig = {
        key: 'root',
        storage: typeof window !== 'undefined'
            ? require('redux-persist/lib/storage').default
            : {
                getItem: function () { return Promise.resolve(null); },
                setItem: function () { return Promise.resolve(); },
                removeItem: function () { return Promise.resolve(); },
            },
        whitelist: ['auth'],
    };
    const persistedReducer = persistReducer(persistConfig, rootReducer);
    const store = configureStore({
        reducer: persistedReducer,
        middleware: function (getDefaultMiddleware) {
            return getDefaultMiddleware({
                serializableCheck: {
                    ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
                },
            });
        },
    });
    const persistor = persistStore(store);
    return { store: store, persistor: persistor };
}
