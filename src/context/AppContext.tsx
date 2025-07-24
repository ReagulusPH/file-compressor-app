import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { AppState, CompressionSettings, FileModel, CompressionResult, CompressionMode } from '../types';
import { reducer, initialState } from './reducer';
import { ActionType } from './types';

/**
 * Interface for the AppContext
 */
interface AppContextType {
  state: AppState;
  addFiles: (files: File[], settings: CompressionSettings) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  updateFileStatus: (id: string, status: FileModel['status'], startTime?: number, endTime?: number) => void;
  updateFileProgress: (id: string, progress: number) => void;
  updateFileError: (id: string, error: string) => void;
  setFileResult: (id: string, result: CompressionResult) => void;
  updateGlobalSettings: (settings: Partial<CompressionSettings>) => void;
  setCompressionMode: (mode: CompressionMode) => void;
  setActiveFile: (id: string | undefined) => void;
  setProcessing: (isProcessing: boolean) => void;
  addError: (id: string, message: string) => void;
  clearError: (id: string) => void;
  clearAllErrors: () => void;
}

// Create the context with a default value
const AppContext = createContext<AppContextType | undefined>(undefined);

// Storage key for persisting settings
const SETTINGS_STORAGE_KEY = 'file-compressor-settings';

/**
 * Provider component for the AppContext
 */
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load saved settings from localStorage if available
  const loadSavedSettings = (): Partial<CompressionSettings> => {
    try {
      const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (savedSettings) {
        return JSON.parse(savedSettings);
      }
    } catch (error) {
      // Failed to load settings from localStorage, using defaults
    }
    return {};
  };

  // Initialize state with saved settings
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    globalSettings: {
      ...initialState.globalSettings,
      ...loadSavedSettings(),
    },
  });

  // Save settings to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(state.globalSettings));
    } catch (error) {
      // Failed to save settings to localStorage
    }
  }, [state.globalSettings]);

  // Action creators
  const addFiles = (files: File[], settings: CompressionSettings) => {
    dispatch({
      type: ActionType.ADD_FILES,
      payload: { files, settings },
    });
  };

  const removeFile = (id: string) => {
    dispatch({
      type: ActionType.REMOVE_FILE,
      payload: { id },
    });
  };

  const clearFiles = () => {
    dispatch({
      type: ActionType.CLEAR_FILES,
    });
  };

  const updateFileStatus = (id: string, status: FileModel['status'], startTime?: number, endTime?: number) => {
    dispatch({
      type: ActionType.UPDATE_FILE_STATUS,
      payload: { id, status, startTime, endTime },
    });
  };

  const updateFileProgress = (id: string, progress: number) => {
    dispatch({
      type: ActionType.UPDATE_FILE_PROGRESS,
      payload: { id, progress },
    });
  };

  const updateFileError = (id: string, error: string) => {
    dispatch({
      type: ActionType.UPDATE_FILE_ERROR,
      payload: { id, error },
    });
  };

  const setFileResult = (id: string, result: CompressionResult) => {
    dispatch({
      type: ActionType.SET_FILE_RESULT,
      payload: { id, result },
    });
  };

  const updateGlobalSettings = (settings: Partial<CompressionSettings>) => {
    dispatch({
      type: ActionType.UPDATE_GLOBAL_SETTINGS,
      payload: { settings },
    });
  };

  const setCompressionMode = (mode: CompressionMode) => {
    dispatch({
      type: ActionType.SET_COMPRESSION_MODE,
      payload: { mode },
    });
  };

  const setActiveFile = (id: string | undefined) => {
    dispatch({
      type: ActionType.SET_ACTIVE_FILE,
      payload: { id },
    });
  };

  const setProcessing = (isProcessing: boolean) => {
    dispatch({
      type: ActionType.SET_PROCESSING,
      payload: { isProcessing },
    });
  };

  const addError = (id: string, message: string) => {
    dispatch({
      type: ActionType.ADD_ERROR,
      payload: { id, message },
    });
  };

  const clearError = (id: string) => {
    dispatch({
      type: ActionType.CLEAR_ERROR,
      payload: { id },
    });
  };

  const clearAllErrors = () => {
    dispatch({
      type: ActionType.CLEAR_ALL_ERRORS,
    });
  };

  // Context value
  const value: AppContextType = {
    state,
    addFiles,
    removeFile,
    clearFiles,
    updateFileStatus,
    updateFileProgress,
    updateFileError,
    setFileResult,
    updateGlobalSettings,
    setCompressionMode,
    setActiveFile,
    setProcessing,
    addError,
    clearError,
    clearAllErrors,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

/**
 * Custom hook to use the AppContext
 */
export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
