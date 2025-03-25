/* ======== DOM References ======== */
console.log("popup.js loading...");

const localTimeDiv = document.getElementById('local-time');
const timeSlider = document.getElementById('time-slider');
const sliderValue = document.getElementById('slider-value');
const timezoneList = document.getElementById('timezone-list');

// The add-panel elements:
const labelInput = document.getElementById('label-input');
const timezoneSelect = document.getElementById('timezone-select');
const addBtn = document.getElementById('add-btn');
const cancelBtn = document.getElementById('cancel-btn');
const addPanelOverlay = document.getElementById('add-panel-overlay');

// The FAB
const fab = document.getElementById('fab');

console.log("DOM elements:", {
  localTimeDiv, timeSlider, sliderValue, timezoneList,
  labelInput, timezoneSelect, addBtn, cancelBtn, addPanelOverlay,
  fab
});

/* ======== Global State ======== */
let timezones = []; // array of { label, id }
let timeShift = 0;  // in hours

/* ======== Initialization ======== */
function init() {
  console.log("init() called");
  populateTimezones();
  loadData();

  // Slider
  timeSlider.addEventListener('input', onSliderInput);
  console.log("Bound onSliderInput to timeSlider");

  // FAB
  fab.addEventListener('click', showAddPanel);
  console.log("Bound showAddPanel to fab");

  // Add/Cancel
  addBtn.addEventListener('click', onAddClicked);
  console.log("Bound onAddClicked to addBtn");
  cancelBtn.addEventListener('click', hideAddPanel);
  console.log("Bound hideAddPanel to cancelBtn");
}

/**
 * Populate time zone dropdown
 */
function populateTimezones() {
  console.log("populateTimezones() called");
  if (typeof Intl.supportedValuesOf === 'function') {
    const zones = Intl.supportedValuesOf('timeZone');
    console.log("Supported timeZones:", zones);
    zones.forEach(zone => {
      const opt = document.createElement('option');
      opt.value = zone;
      opt.textContent = zone;
      timezoneSelect.appendChild(opt);
    });
  } else {
    // Fallback list
    const fallbackZones = [
      'UTC',
      'America/New_York',
      'America/Los_Angeles',
      'Europe/London',
      'Asia/Tokyo',
      'Australia/Sydney'
    ];
    console.log("Fallback timeZones:", fallbackZones);
    fallbackZones.forEach(zone => {
      const opt = document.createElement('option');
      opt.value = zone;
      opt.textContent = zone;
      timezoneSelect.appendChild(opt);
    });
  }
}

/** Load saved data from chrome.storage */
function loadData() {
  console.log("loadData() called");
  chrome.storage.local.get(['timezones', 'timeShift'], (data) => {
    console.log("chrome.storage.local.get:", data);
    timezones = data.timezones || [];
    timeShift = data.timeShift || 0;
    timeSlider.value = timeShift;
    updateSliderLabel();
    renderTimezones();
  });
}

/* ======== Event Handlers ======== */

// Show the overlay panel
function showAddPanel() {
  console.log("showAddPanel() invoked");
  labelInput.value = '';
  addPanelOverlay.style.display = 'flex';
}

// Hide the overlay panel
function hideAddPanel() {
  console.log("hideAddPanel() invoked");
  addPanelOverlay.style.display = 'none';
}

function onAddClicked() {
  console.log("onAddClicked() invoked");
  const label = labelInput.value.trim();
  const tzId = timezoneSelect.value;

  console.log("label =", label, "tzId=", tzId);

  if (!label || !tzId) {
    console.warn("Missing label or tzId.");
    return;
  }
  timezones.push({ label, id: tzId });
  console.log("timezones updated:", timezones);
  hideAddPanel(); // close panel
  saveData();
}

function onSliderInput() {
  timeShift = parseInt(timeSlider.value, 10);
  console.log("onSliderInput: timeShift =", timeShift);
  updateSliderLabel();
  saveData();
}

/* ======== Rendering ======== */
function renderTimezones() {
  console.log("renderTimezones() called. Current timezones:", timezones);
  timezoneList.innerHTML = '';
  updateLocalTime(); // top display

  timezones.forEach((zone, index) => {
    const li = document.createElement('li');
    li.className = 'timezone-row';

    // Shifted time for the zone
    const timeString = getShiftedTimeFormatted(zone.id, timeShift);

    // Info
    const infoDiv = document.createElement('div');
    infoDiv.className = 'timezone-info';
    infoDiv.innerHTML = `\n      <strong>${zone.label}</strong>\n      <span>${timeString}</span>\n      <small>${zone.id}</small>\n    `;

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => {
      console.log("Removing zone at index", index, zone);
      timezones.splice(index, 1);
      saveData();
    });

    li.appendChild(infoDiv);
    li.appendChild(removeBtn);
    timezoneList.appendChild(li);
  });
}

function updateLocalTime() {
  // Start in UTC
  const nowUTC = Date.now();
  const shiftedUTC = nowUTC + timeShift * 3600000;
  const shiftedDate = new Date(shiftedUTC);

  const localString = shiftedDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  localTimeDiv.textContent = `Local Time (shifted): ${localString}`;
  console.log("updateLocalTime() =>", localString);
}

/**
 * Convert now (UTC) plus shift to the given time zone
 */
function getShiftedTime(tzId, shiftHours) {
  const nowUTC = Date.now();
  const shiftedUTC = nowUTC + shiftHours * 3600000;
  const shiftedDate = new Date(shiftedUTC);
  
  // Use Intl.DateTimeFormat to extract date parts for the target time zone.
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tzId,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  const parts = dtf.formatToParts(shiftedDate);
  const dateParts = {};
  parts.forEach(({ type, value }) => {
    if (type !== 'literal') dateParts[type] = value;
  });
  
  // Construct an ISO date string using the extracted parts.
  const formattedString = `${dateParts.year}-${dateParts.month}-${dateParts.day}T${dateParts.hour}:${dateParts.minute}:${dateParts.second}`;
  return new Date(formattedString);
}

function getShiftedTimeFormatted(tzId, shiftHours) {
  const nowUTC = Date.now();
  const shiftedUTC = nowUTC + shiftHours * 3600000;
  const shiftedDate = new Date(shiftedUTC);

  // Use Intl.DateTimeFormat to format the shifted date for the given time zone
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tzId,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(shiftedDate);
}

function updateSliderLabel() {
  sliderValue.textContent = `${timeShift >= 0 ? '+' : ''}${timeShift}h`;
  console.log("updateSliderLabel =>", sliderValue.textContent);
}

function saveData() {
  chrome.storage.local.set({ timezones, timeShift }, () => {
    console.log("Data saved:", { timezones, timeShift });
    renderTimezones();
  });
}

/* ======== Start the extension ======== */
console.log("Calling init()...");
init();

/* Optional: update every minute
   setInterval(() => { renderTimezones(); }, 60000);
*/
