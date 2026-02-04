// =============================================================================
// PROJECT SELECTION MODAL (draggable window)
// =============================================================================

import { PROJECTS } from "./config.js";
import { state } from "./state.js";
import { createVirtualWindowWithProject } from "./windows.js";
import { makeDraggable } from "./drag.js";

let modalOverlay,
  modal,
  modalTitlebar,
  projectSelect,
  assetSelectContainer,
  assetSelect,
  modalOpenBtn,
  modalCancelBtn,
  modalClose;
export let modalVisible = false;

// Projects with gallery assets
const PROJECTS_WITH_ASSETS = {
  draw_m3_like_one_of_your_ZnJlbmNoIGdpcmxz: "gallery.json",
  circling_cycle: "shapes.json",
  moody_parkour: "emotions", // Special: hardcoded emotions, no JSON file
};

// Hardcoded emotions for moody_parkour
const MOODY_PARKOUR_EMOTIONS = [
  "happy",
  "sad",
  "angry",
  "love",
  "surprised",
  "confused",
  "sleepy",
  "excited",
];

// Loaded asset data (cached)
const assetCache = {};

export function initModal() {
  modalOverlay = document.getElementById("modalOverlay");
  modal = modalOverlay.querySelector(".modal");
  modalTitlebar = document.getElementById("modalTitlebar");
  projectSelect = document.getElementById("projectSelect");
  assetSelectContainer = document.getElementById("assetSelectContainer");
  assetSelect = document.getElementById("assetSelect");
  modalOpenBtn = document.getElementById("modalOpenBtn");
  modalCancelBtn = document.getElementById("modalCancelBtn");
  modalClose = document.getElementById("modalClose");

  // Modal button handlers
  modalOpenBtn.addEventListener("click", confirmProjectSelection);
  modalCancelBtn.addEventListener("click", hideProjectModal);
  modalClose.addEventListener("click", hideProjectModal);

  // Project select change handler - update asset dropdown
  projectSelect.addEventListener("change", updateAssetDropdown);

  // Make modal draggable by its title bar
  makeDraggable(modal, modalTitlebar);
}

function initProjectSelect() {
  projectSelect.innerHTML = "";
  PROJECTS.forEach((project) => {
    const option = document.createElement("option");
    option.value = project;
    option.textContent = project;
    projectSelect.appendChild(option);
  });
}

export function showProjectModal() {
  initProjectSelect();

  // Center the modal
  modal.style.left = "50%";
  modal.style.top = "50%";
  modal.style.transform = "translate(-50%, -50%)";

  // Bring to front
  state.currentZIndex++;
  modal.style.zIndex = state.currentZIndex;

  modalOverlay.classList.add("visible");
  projectSelect.focus();
  modalVisible = true;

  // Update asset dropdown for initial selection
  updateAssetDropdown();
}

export function hideProjectModal() {
  modalOverlay.classList.remove("visible");
  modalVisible = false;
}

// Load assets for a project
async function loadProjectAssets(project) {
  if (assetCache[project]) {
    return assetCache[project];
  }

  const assetFile = PROJECTS_WITH_ASSETS[project];
  if (!assetFile) return null;

  try {
    const response = await fetch(`../../${project}/${assetFile}`);
    if (!response.ok) throw new Error(`Failed to load ${assetFile}`);
    const data = await response.json();
    assetCache[project] = data;
    return data;
  } catch (err) {
    console.error(`Failed to load assets for ${project}:`, err);
    return null;
  }
}

// Update asset dropdown based on selected project
async function updateAssetDropdown() {
  const project = projectSelect.value;

  if (!PROJECTS_WITH_ASSETS[project]) {
    // Project doesn't have assets, hide dropdown
    assetSelectContainer.classList.add("hidden");
    return;
  }

  // Clear existing options except "random"
  assetSelect.innerHTML = '<option value="random">random</option>';

  // Handle moody_parkour specially (hardcoded emotions, no JSON file)
  if (project === "moody_parkour") {
    MOODY_PARKOUR_EMOTIONS.forEach((emotion) => {
      const option = document.createElement("option");
      option.value = emotion;
      option.textContent = emotion;
      assetSelect.appendChild(option);
    });
    assetSelectContainer.classList.remove("hidden");
    return;
  }

  // Load assets from JSON file
  const assets = await loadProjectAssets(project);
  if (!assets) {
    assetSelectContainer.classList.add("hidden");
    return;
  }

  // Add asset options based on project type
  if (project === "draw_m3_like_one_of_your_ZnJlbmNoIGdpcmxz") {
    // Gallery images
    assets.images.forEach((img) => {
      const option = document.createElement("option");
      option.value = img.id;
      option.textContent = img.id;
      assetSelect.appendChild(option);
    });
  } else if (project === "circling_cycle") {
    // Shapes
    assets.shapes.forEach((shape) => {
      const option = document.createElement("option");
      option.value = shape.id;
      option.textContent = shape.name;
      assetSelect.appendChild(option);
    });
  }

  // Show dropdown
  assetSelectContainer.classList.remove("hidden");
}

export function confirmProjectSelection() {
  const project = projectSelect.value;
  const asset = assetSelect.value; // "random" or specific asset ID
  hideProjectModal();
  createVirtualWindowWithProject(project, asset);
}
