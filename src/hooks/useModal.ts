import { useState, useCallback } from 'react';

/**
 * Custom hook for using modal dialogs
 */
const useModal = (initialState = false) => {
  const [isOpen, setIsOpen] = useState(initialState);

  /**
   * Open the modal
   */
  const openModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  /**
   * Close the modal
   */
  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  /**
   * Toggle the modal state
   */
  const toggleModal = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return {
    isOpen,
    openModal,
    closeModal,
    toggleModal,
  };
};

export default useModal;
