// =============================================================================
// PROJECT SELECTION MODAL (draggable window)
// =============================================================================

import { PROJECTS } from './config.js';
import { state } from './state.js';
import { createVirtualWindowWithProject } from './windows.js';
import { makeDraggable } from './drag.js';

let modalOverlay, modal, modalTitlebar, projectSelect, modalOpenBtn, modalCancelBtn, modalClose;
export let modalVisible = false;

export function initModal() {
  modalOverlay = document.getElementById('modalOverlay');
  modal = modalOverlay.querySelector('.modal');
  modalTitlebar = document.getElementById('modalTitlebar');
  projectSelect = document.getElementById('projectSelect');
  modalOpenBtn = document.getElementById('modalOpenBtn');
  modalCancelBtn = document.getElementById('modalCancelBtn');
  modalClose = document.getElementById('modalClose');

  // Modal button handlers
  modalOpenBtn.addEventListener('click', confirmProjectSelection);
  modalCancelBtn.addEventListener('click', hideProjectModal);
  modalClose.addEventListener('click', hideProjectModal);

  // Make modal draggable by its title bar
  makeDraggable(modal, modalTitlebar);
}

function initProjectSelect() {
  projectSelect.innerHTML = '';
  PROJECTS.forEach(project => {
    const option = document.createElement('option');
    option.value = project;
    option.textContent = project;
    projectSelect.appendChild(option);
  });
}

export function showProjectModal() {
  initProjectSelect();

  // Center the modal
  modal.style.left = '50%';
  modal.style.top = '50%';
  modal.style.transform = 'translate(-50%, -50%)';

  // Bring to front
  state.currentZIndex++;
  modal.style.zIndex = state.currentZIndex;

  modalOverlay.classList.add('visible');
  projectSelect.focus();
  modalVisible = true;
}

export function hideProjectModal() {
  modalOverlay.classList.remove('visible');
  modalVisible = false;
}

export function confirmProjectSelection() {
  const project = projectSelect.value;
  hideProjectModal();
  createVirtualWindowWithProject(project);
}
