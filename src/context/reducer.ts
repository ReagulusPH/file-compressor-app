import { AppState, FileModel } from '../types';
import { ActionType, AppAction } from './types';

/**
 * Generate a unique ID
 * @returns A unique ID string
 */
const generateId = (): string => {
  return `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Initial state for the application
 */
export const initialState: AppState = {
  files: {},
  globalSettings: {
    quality: 40, // More aggressive default compression
    outputFormat: 'jpeg',
  },
  compressionMode: 'image',
  isProcessing: false,
  errors: {},
};

/**
 * Reducer function for the application state
 * @param state Current state
 * @param action Action to perform
 * @returns New state
 */
export const reducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case ActionType.ADD_FILES: {
      const { files, settings } = action.payload;
      const newFiles: Record<string, FileModel> = {};

      files.forEach(file => {
        const id = generateId();
        newFiles[id] = {
          id,
          originalFile: file,
          settings: { ...settings },
          status: 'waiting',
          progress: 0,
        };
      });

      return {
        ...state,
        files: {
          ...state.files,
          ...newFiles,
        },
      };
    }

    case ActionType.REMOVE_FILE: {
      const { id } = action.payload;
      const newFiles = { ...state.files };
      delete newFiles[id];

      return {
        ...state,
        files: newFiles,
      };
    }

    case ActionType.CLEAR_FILES: {
      return {
        ...state,
        files: {},
        isProcessing: false,
      };
    }

    case ActionType.UPDATE_FILE_STATUS: {
      const { id, status, startTime, endTime } = action.payload;
      const file = state.files[id];

      if (!file) {
        return state;
      }

      return {
        ...state,
        files: {
          ...state.files,
          [id]: {
            ...file,
            status,
            ...(startTime !== undefined && { startTime }),
            ...(endTime !== undefined && { endTime }),
          },
        },
      };
    }

    case ActionType.UPDATE_FILE_PROGRESS: {
      const { id, progress } = action.payload;
      const file = state.files[id];

      if (!file) {
        return state;
      }

      return {
        ...state,
        files: {
          ...state.files,
          [id]: {
            ...file,
            progress,
          },
        },
      };
    }

    case ActionType.UPDATE_FILE_ERROR: {
      const { id, error } = action.payload;
      const file = state.files[id];

      if (!file) {
        return state;
      }

      return {
        ...state,
        files: {
          ...state.files,
          [id]: {
            ...file,
            status: 'error',
            error,
          },
        },
      };
    }

    case ActionType.SET_FILE_RESULT: {
      const { id, result } = action.payload;
      const file = state.files[id];

      if (!file) {
        return state;
      }

      return {
        ...state,
        files: {
          ...state.files,
          [id]: {
            ...file,
            result,
            status: 'complete',
            progress: 100,
          },
        },
      };
    }

    case ActionType.UPDATE_GLOBAL_SETTINGS: {
      const { settings } = action.payload;

      return {
        ...state,
        globalSettings: {
          ...state.globalSettings,
          ...settings,
        },
      };
    }

    case ActionType.SET_COMPRESSION_MODE: {
      const { mode } = action.payload;

      return {
        ...state,
        compressionMode: mode,
        // Clear files when switching modes to avoid confusion
        files: {},
      };
    }

    case ActionType.SET_ACTIVE_FILE: {
      const { id } = action.payload;

      return {
        ...state,
        activeFileId: id,
      };
    }

    case ActionType.SET_PROCESSING: {
      const { isProcessing } = action.payload;

      return {
        ...state,
        isProcessing,
      };
    }

    case ActionType.ADD_ERROR: {
      const { id, message } = action.payload;

      return {
        ...state,
        errors: {
          ...state.errors,
          [id]: message,
        },
      };
    }

    case ActionType.CLEAR_ERROR: {
      const { id } = action.payload;
      const newErrors = { ...state.errors };
      delete newErrors[id];

      return {
        ...state,
        errors: newErrors,
      };
    }

    case ActionType.CLEAR_ALL_ERRORS: {
      return {
        ...state,
        errors: {},
      };
    }

    default:
      return state;
  }
};
