import { ref } from 'vue'

type UseDataGridOverlayStateOptions = {
  closeFilterMenus: () => void
  syncFilterDialogDraftState: () => void
  syncColumnDialogDraftState: () => void
  createNewView: (name: string) => void | Promise<void>
}

export function useDataGridOverlayState(options: UseDataGridOverlayStateOptions) {
  const openMenuColumnId = ref<string | null>(null)
  const isColumnPickerOpen = ref(false)
  const isFilterDialogOpen = ref(false)
  const isFilterHelpDialogOpen = ref(false)
  const isViewsMenuOpen = ref(false)
  const isSaveViewDialogOpen = ref(false)
  const newViewName = ref('')

  function closeOverlayState(closeOptions?: { keepDialogsOpen?: boolean }) {
    openMenuColumnId.value = null
    isViewsMenuOpen.value = false
    isSaveViewDialogOpen.value = false

    if (!closeOptions?.keepDialogsOpen) {
      isFilterDialogOpen.value = false
      isFilterHelpDialogOpen.value = false
      isColumnPickerOpen.value = false
    }
  }

  function openSaveViewDialog() {
    newViewName.value = ''
    isSaveViewDialogOpen.value = true
    isViewsMenuOpen.value = false
    openMenuColumnId.value = null
    options.closeFilterMenus()
    isColumnPickerOpen.value = false
    isFilterDialogOpen.value = false
    isFilterHelpDialogOpen.value = false
  }

  function closeSaveViewDialog() {
    isSaveViewDialogOpen.value = false
    newViewName.value = ''
  }

  function saveNewView() {
    const name = newViewName.value.trim()

    if (!name) {
      return
    }

    void options.createNewView(name)
    closeSaveViewDialog()
  }

  function toggleViewsMenu() {
    isViewsMenuOpen.value = !isViewsMenuOpen.value
    openMenuColumnId.value = null
    options.closeFilterMenus()
    isColumnPickerOpen.value = false
    isFilterDialogOpen.value = false
    isFilterHelpDialogOpen.value = false
    isSaveViewDialogOpen.value = false
  }

  function toggleFilterHelpDialog() {
    isFilterHelpDialogOpen.value = !isFilterHelpDialogOpen.value
    openMenuColumnId.value = null
    options.closeFilterMenus()
    isColumnPickerOpen.value = false
    isFilterDialogOpen.value = false
    isViewsMenuOpen.value = false
    isSaveViewDialogOpen.value = false
  }

  function handleDocumentClick(event: MouseEvent) {
    const target = event.target

    if (!(target instanceof HTMLElement)) {
      return
    }

    if (target.closest('[data-grid-menu-root="true"]')) {
      return
    }

    if (target.closest('[data-grid-filter-root="true"]')) {
      return
    }

    if (target.closest('[data-grid-view-root="true"]')) {
      return
    }

    if (target.closest('[data-grid-dialog-root="true"]')) {
      return
    }

    openMenuColumnId.value = null
    options.closeFilterMenus()
    isColumnPickerOpen.value = false
    isFilterDialogOpen.value = false
    isFilterHelpDialogOpen.value = false
    isViewsMenuOpen.value = false
    isSaveViewDialogOpen.value = false
  }

  function toggleColumnPicker() {
    const nextOpen = !isColumnPickerOpen.value
    isColumnPickerOpen.value = nextOpen
    openMenuColumnId.value = null
    options.closeFilterMenus()
    isFilterDialogOpen.value = false
    isViewsMenuOpen.value = false
    isSaveViewDialogOpen.value = false

    if (nextOpen) {
      options.syncColumnDialogDraftState()
    }
  }

  function closeColumnPicker() {
    isColumnPickerOpen.value = false
  }

  function resetDialogFilterDraftState() {
    options.syncFilterDialogDraftState()
    options.closeFilterMenus()
  }

  function openFilterDialog() {
    isFilterDialogOpen.value = true
    openMenuColumnId.value = null
    options.closeFilterMenus()
    isColumnPickerOpen.value = false
    isViewsMenuOpen.value = false
    isSaveViewDialogOpen.value = false
    resetDialogFilterDraftState()
  }

  function toggleFilterDialog() {
    if (isFilterDialogOpen.value) {
      closeFilterDialog()
      return
    }

    openFilterDialog()
  }

  function closeFilterDialog() {
    isFilterDialogOpen.value = false
    resetDialogFilterDraftState()
  }

  function toggleColumnMenu(columnId: string) {
    openMenuColumnId.value = openMenuColumnId.value === columnId ? null : columnId
    options.closeFilterMenus()
    isColumnPickerOpen.value = false
    isFilterDialogOpen.value = false
  }

  function closeColumnMenu() {
    openMenuColumnId.value = null
  }

  return {
    openMenuColumnId,
    isColumnPickerOpen,
    isFilterDialogOpen,
    isFilterHelpDialogOpen,
    isViewsMenuOpen,
    isSaveViewDialogOpen,
    newViewName,
    closeOverlayState,
    openSaveViewDialog,
    closeSaveViewDialog,
    saveNewView,
    toggleViewsMenu,
    toggleFilterHelpDialog,
    handleDocumentClick,
    toggleColumnPicker,
    closeColumnPicker,
    resetDialogFilterDraftState,
    openFilterDialog,
    toggleFilterDialog,
    closeFilterDialog,
    toggleColumnMenu,
    closeColumnMenu,
  }
}
