import { CompressionSettings, FileModel, CompressionResult, CompressionMode } from '../types';

/**
 * Action types for the application state
 */
/* eslint-disable no-unused-vars */
export enum ActionType {
  ADD_FILES = 'ADD_FILES',
  REMOVE_FILE = 'REMOVE_FILE',
  CLEAR_FILES = 'CLEAR_FILES',
  UPDATE_FILE_STATUS = 'UPDATE_FILE_STATUS',
  UPDATE_FILE_PROGRESS = 'UPDATE_FILE_PROGRESS',
  UPDATE_FILE_ERROR = 'UPDATE_FILE_ERROR',
  SET_FILE_RESULT = 'SET_FILE_RESULT',
  UPDATE_GLOBAL_SETTINGS = 'UPDATE_GLOBAL_SETTINGS',
  SET_COMPRESSION_MODE = 'SET_COMPRESSION_MODE',
  SET_ACTIVE_FILE = 'SET_ACTIVE_FILE',
  SET_PROCESSING = 'SET_PROCESSING',
  ADD_ERROR = 'ADD_ERROR',
  CLEAR_ERROR = 'CLEAR_ERROR',
  CLEAR_ALL_ERRORS = 'CLEAR_ALL_ERRORS',
}
/* eslint-enable no-unused-vars */

/**
 * Base action interface
 */
export interface Action {
  type: ActionType;
}

/**
 * Add files action
 */
export interface AddFilesAction extends Action {
  type: ActionType.ADD_FILES;
  payload: {
    files: File[];
    settings: CompressionSettings;
  };
}

/**
 * Remove file action
 */
export interface RemoveFileAction extends Action {
  type: ActionType.REMOVE_FILE;
  payload: {
    id: string;
  };
}

/**
 * Clear files action
 */
export interface ClearFilesAction extends Action {
  type: ActionType.CLEAR_FILES;
}

/**
 * Update file status action
 */
export interface UpdateFileStatusAction extends Action {
  type: ActionType.UPDATE_FILE_STATUS;
  payload: {
    id: string;
    status: FileModel['status'];
    startTime?: number;
    endTime?: number;
  };
}

/**
 * Update file progress action
 */
export interface UpdateFileProgressAction extends Action {
  type: ActionType.UPDATE_FILE_PROGRESS;
  payload: {
    id: string;
    progress: number;
  };
}

/**
 * Update file error action
 */
export interface UpdateFileErrorAction extends Action {
  type: ActionType.UPDATE_FILE_ERROR;
  payload: {
    id: string;
    error: string;
  };
}

/**
 * Set file result action
 */
export interface SetFileResultAction extends Action {
  type: ActionType.SET_FILE_RESULT;
  payload: {
    id: string;
    result: CompressionResult;
  };
}

/**
 * Update global settings action
 */
export interface UpdateGlobalSettingsAction extends Action {
  type: ActionType.UPDATE_GLOBAL_SETTINGS;
  payload: {
    settings: Partial<CompressionSettings>;
  };
}

/**
 * Set compression mode action
 */
export interface SetCompressionModeAction extends Action {
  type: ActionType.SET_COMPRESSION_MODE;
  payload: {
    mode: CompressionMode;
  };
}

/**
 * Set active file action
 */
export interface SetActiveFileAction extends Action {
  type: ActionType.SET_ACTIVE_FILE;
  payload: {
    id: string | undefined;
  };
}

/**
 * Set processing action
 */
export interface SetProcessingAction extends Action {
  type: ActionType.SET_PROCESSING;
  payload: {
    isProcessing: boolean;
  };
}

/**
 * Add error action
 */
export interface AddErrorAction extends Action {
  type: ActionType.ADD_ERROR;
  payload: {
    id: string;
    message: string;
  };
}

/**
 * Clear error action
 */
export interface ClearErrorAction extends Action {
  type: ActionType.CLEAR_ERROR;
  payload: {
    id: string;
  };
}

/**
 * Clear all errors action
 */
export interface ClearAllErrorsAction extends Action {
  type: ActionType.CLEAR_ALL_ERRORS;
}

/**
 * Union type of all actions
 */
export type AppAction =
  | AddFilesAction
  | RemoveFileAction
  | ClearFilesAction
  | UpdateFileStatusAction
  | UpdateFileProgressAction
  | UpdateFileErrorAction
  | SetFileResultAction
  | UpdateGlobalSettingsAction
  | SetCompressionModeAction
  | SetActiveFileAction
  | SetProcessingAction
  | AddErrorAction
  | ClearErrorAction
  | ClearAllErrorsAction;
