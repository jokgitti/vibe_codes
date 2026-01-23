// =============================================================================
// PROJECT SELECTION MODAL
// =============================================================================

import { PROJECTS } from './config.js';
import { createVirtualWindowWithProject } from './windows.js';

let modalOverlay, projectSelect, modalOpenBtn, modalCancelBtn;
export let modalVisible = false;

export function initModal() {
  modalOverlay = document.getElementById('modalOverlay');
  projectSelect = document.getElementById('projectSelect');
  modalOpenBtn = document.getElementById('modalOpenBtn');
  modalCancelBtn = document.getElementById('modalCancelBtn');

  // Modal button handlers
  modalOpenBtn.addEventListener('click', confirmProjectSelection);
  modalCancelBtn.addEventListener('click', hideProjectModal);

  // Click outside modal to close
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      hideProjectModal();
    }
  });
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
