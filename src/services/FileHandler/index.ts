/**
 * FileHandler service exports
 */

import FileHandler, {
  FileHandlerService,
} from './FileHandler';

import {
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_VIDEO_TYPES,
  SUPPORTED_FILE_TYPES,
  MAX_FILE_SIZE,
} from '../../utils/errors/ErrorUtils';

export type { FileHandlerService };

export {
  FileHandler as default,
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_VIDEO_TYPES,
  SUPPORTED_FILE_TYPES,
  MAX_FILE_SIZE,
};
