const STORAGE_KEY = "gpa-calculator-data";

// Thai grading scale: score -> grade points
const GRADE_SCALE = [
  { min: 80, grade: "4", points: 4.0 },
  { min: 75, grade: "3.5", points: 3.5 },
  { min: 70, grade: "3", points: 3.0 },
  { min: 65, grade: "2.5", points: 2.5 },
  { min: 60, grade: "2", points: 2.0 },
  { min: 55, grade: "1.5", points: 1.5 },
  { min: 50, grade: "1", points: 1.0 },
  { min: 45, grade: "0.5", points: 0.5 },
  { min: -Infinity, grade: "0", points: 0.0 },
];

function scoreToGrade(score) {
  const clamped = Math.max(0, Math.min(100, score));
  const entry = GRADE_SCALE.find((e) => clamped >= e.min);
  return entry;
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Could not load saved data", e);
  }
  return { semesters: { "Semester 1": [] }, current: "Semester 1" };
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadData();

// --- DOM refs ---
const semesterSelect = document.getElementById("semesterSelect");
const addSemesterBtn = document.getElementById("addSemesterBtn");
const renameSemesterBtn = document.getElementById("renameSemesterBtn");
const deleteSemesterBtn = document.getElementById("deleteSemesterBtn");

const courseName = document.getElementById("courseName");
const courseScore = document.getElementById("courseScore");
const courseCredits = document.getElementById("courseCredits");
const addCourseBtn = document.getElementById("addCourseBtn");

const courseTableBody = document.getElementById("courseTableBody");
const emptyMsg = document.getElementById("emptyMsg");

const semesterGpaEl = document.getElementById("semesterGpa");
const cumulativeGpaEl = document.getElementById("cumulativeGpa");

function currentCourses() {
  return state.semesters[state.current] || [];
}

function computeGpa(courses) {
  const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);
  if (totalCredits === 0) return 0;
  const totalPoints = courses.reduce((sum, c) => sum + c.points * c.credits, 0);
  return totalPoints / totalCredits;
}

function computeCumulativeGpa() {
  const all = Object.values(state.semesters).flat();
  return computeGpa(all);
}

function renderSemesterSelect() {
  semesterSelect.innerHTML = "";
  Object.keys(state.semesters).forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    if (name === state.current) opt.selected = true;
    semesterSelect.appendChild(opt);
  });
}

function renderTable() {
  const courses = currentCourses();
  courseTableBody.innerHTML = "";
  emptyMsg.style.display = courses.length === 0 ? "block" : "none";

  courses.forEach((c, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(c.name)}</td>
      <td>${c.score}</td>
      <td>${c.grade}</td>
      <td>${c.points.toFixed(1)}</td>
      <td>${c.credits}</td>
      <td><button class="row-remove" data-idx="${idx}" title="Remove">✕</button></td>
    `;
    courseTableBody.appendChild(tr);
  });

  courseTableBody.querySelectorAll(".row-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.idx);
      currentCourses().splice(idx, 1);
      saveData();
      renderAll();
    });
  });
}

function renderSummary() {
  semesterGpaEl.textContent = computeGpa(currentCourses()).toFixed(2);
  cumulativeGpaEl.textContent = computeCumulativeGpa().toFixed(2);
}

function renderAll() {
  renderSemesterSelect();
  renderTable();
  renderSummary();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// --- Events ---
addCourseBtn.addEventListener("click", () => {
  const name = courseName.value.trim() || "Untitled Course";
  const score = parseFloat(courseScore.value);
  const credits = parseFloat(courseCredits.value);

  if (isNaN(score) || score < 0 || score > 100) {
    alert("Enter a valid score between 0 and 100.");
    return;
  }
  if (isNaN(credits) || credits <= 0) {
    alert("Enter valid credit hours (greater than 0).");
    return;
  }

  const { grade, points } = scoreToGrade(score);
  currentCourses().push({ name, score, grade, points, credits });
  saveData();

  courseName.value = "";
  courseScore.value = "";
  courseCredits.value = "";
  courseName.focus();

  renderAll();
});

semesterSelect.addEventListener("change", () => {
  state.current = semesterSelect.value;
  saveData();
  renderAll();
});

addSemesterBtn.addEventListener("click", () => {
  const name = prompt("New semester name:", `Semester ${Object.keys(state.semesters).length + 1}`);
  if (!name) return;
  if (state.semesters[name]) {
    alert("A semester with that name already exists.");
    return;
  }
  state.semesters[name] = [];
  state.current = name;
  saveData();
  renderAll();
});

renameSemesterBtn.addEventListener("click", () => {
  const oldName = state.current;
  const newName = prompt("Rename semester:", oldName);
  if (!newName || newName === oldName) return;
  if (state.semesters[newName]) {
    alert("A semester with that name already exists.");
    return;
  }
  state.semesters[newName] = state.semesters[oldName];
  delete state.semesters[oldName];
  state.current = newName;
  saveData();
  renderAll();
});

deleteSemesterBtn.addEventListener("click", () => {
  const names = Object.keys(state.semesters);
  if (names.length <= 1) {
    alert("You must keep at least one semester.");
    return;
  }
  if (!confirm(`Delete "${state.current}" and all its courses?`)) return;
  delete state.semesters[state.current];
  state.current = Object.keys(state.semesters)[0];
  saveData();
  renderAll();
});

// --- Init ---
renderAll();
