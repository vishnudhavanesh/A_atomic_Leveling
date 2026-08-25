// --- 1. User & Storage Initialization ---
const activeUserId = localStorage.getItem("active_shinobi_id");
const usersDB = JSON.parse(localStorage.getItem("shinobi_users_db")) || {};

if (!activeUserId || !usersDB[activeUserId]) {
  window.location.href = "register.html";
}

const currentUser = usersDB[activeUserId];
let tasks = currentUser.tasks || [];
let completionHistory = currentUser.completionHistory || {};

function switchUser() {
  localStorage.removeItem("active_shinobi_id");
  window.location.href = "register.html";
}

// --- 2. Naruto Shinobi Evolution Assets ---
const SHINOBI_AVATARS = {
  LEVEL_1: "https://encrypted-tbn2.gstatic.com/licensed-image?q=tbn:ANd9GcSZ1mind2UzSYfLG1kossFhdUEXFBdlH3-oZxzJ3X5fMabV_Fn50Yx78b9d4ulE3OavkAmolWlbUoVKn2k",
  LEVEL_2: "https://encrypted-tbn0.gstatic.com/licensed-image?q=tbn:ANd9GcSFQgx6kxnw8j5xjQOat-IRYYES97bWrlCJKiiT8vWoXpZt_RNAQ_trFX6LhYTCRRrm70533B7EG2RVFsY",
  LEVEL_3: "https://encrypted-tbn3.gstatic.com/licensed-image?q=tbn:ANd9GcRQMBW0wgYNQCtYTJ_i1-AtaSmKx_IAOUjFFNi5k-qYnBURc09po63bxdE8d5eFcmFopwQyyh370ojf89w"
};

// --- 3. Date Utilities ---
function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateDisplay() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function getPastDates(count) {
  const dates = [];
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
  }
  return dates;
}

function saveData() {
  usersDB[activeUserId].tasks = tasks;
  usersDB[activeUserId].completionHistory = completionHistory;
  localStorage.setItem("shinobi_users_db", JSON.stringify(usersDB));
}

// --- 4. Streak & Evolution Calculation (>= 70% threshold) ---
function calculateOverallStreak() {
  if (tasks.length === 0) return 0;

  const today = getTodayString();
  let streak = 0;
  let d = new Date();

  function isDayQualified(dateStr) {
    if (!completionHistory[dateStr]) return false;
    const completedOnDate = completionHistory[dateStr].filter(id =>
      tasks.some(t => t.id === id)
    ).length;
    const pct = (completedOnDate / tasks.length) * 100;
    return pct >= 70;
  }

  if (isDayQualified(today)) {
    streak++;
  }

  while (true) {
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const prevDateStr = `${year}-${month}-${day}`;

    if (isDayQualified(prevDateStr)) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

function getHunterRank(streakDays) {
  if (streakDays <= 10) {
    return {
      level: 1,
      rankText: "Genin Rank",
      avatar: SHINOBI_AVATARS.LEVEL_1,
      nextTarget: "11 Days (Sage Mode)",
      progressToNext: Math.min((streakDays / 10) * 100, 100)
    };
  } else if (streakDays <= 20) {
    return {
      level: 2,
      rankText: "Sage Rank - Awakened",
      avatar: SHINOBI_AVATARS.LEVEL_2,
      nextTarget: "21 Days (Six Paths Hokage)",
      progressToNext: Math.min(((streakDays - 10) / 10) * 100, 100)
    };
  } else {
    return {
      level: 3,
      rankText: "Hokage / Six Paths",
      avatar: SHINOBI_AVATARS.LEVEL_3,
      nextTarget: "Hokage Achieved! 🍥",
      progressToNext: 100
    };
  }
}

// --- 5. Core Task Operations ---
function addTask(title) {
  const newTask = {
    id: Date.now(),
    title: title.trim(),
    createdAt: getTodayString()
  };
  tasks.push(newTask);
  saveData();
  render();
}

function deleteTask(id) {
  tasks = tasks.filter(task => task.id !== id);
  for (const date in completionHistory) {
    completionHistory[date] = completionHistory[date].filter(taskId => taskId !== id);
  }
  saveData();
  render();
}

function toggleTask(id) {
  const today = getTodayString();
  if (!completionHistory[today]) {
    completionHistory[today] = [];
  }

  const index = completionHistory[today].indexOf(id);
  const wasChecked = index > -1;

  if (wasChecked) {
    completionHistory[today].splice(index, 1);
  } else {
    completionHistory[today].push(id);
  }

  saveData();
  render();

  if (!wasChecked && tasks.length > 0 && completionHistory[today].length === tasks.length) {
    triggerConfetti();
  }
}

function triggerConfetti() {
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.65 },
      colors: ['#f97316', '#6366f1', '#10b981', '#fbbf24']
    });
  }
}

// --- 6. Export / Import Backup Logic ---
function exportData() {
  const backup = { activeUserId, usersDB };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `shinobi-backup-${activeUserId}-${getTodayString()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (data.usersDB) {
        localStorage.setItem("shinobi_users_db", JSON.stringify(data.usersDB));
        if (data.activeUserId) {
          localStorage.setItem("active_shinobi_id", data.activeUserId);
        }
        location.reload();
      } else {
        alert("Invalid shinobi backup file format.");
      }
    } catch (err) {
      alert("Error reading file.");
    }
  };
  reader.readAsText(file);
}

// --- 7. Analytics Computations ---
function calculateProgress(daysCount) {
  if (tasks.length === 0) return { percent: 0, completed: 0, totalPossible: 0 };

  const dates = getPastDates(daysCount);
  const totalPossible = tasks.length * daysCount;
  let totalCompleted = 0;

  dates.forEach(date => {
    if (completionHistory[date]) {
      const validCompleted = completionHistory[date].filter(id =>
        tasks.some(t => t.id === id)
      );
      totalCompleted += validCompleted.length;
    }
  });

  const percent = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
  return { percent, completed: totalCompleted, totalPossible };
}

// --- 8. UI Rendering ---
function render() {
  const today = getTodayString();
  const completedToday = completionHistory[today] || [];
  const taskListEl = document.getElementById("task-list");
  const emptyStateEl = document.getElementById("empty-state");
  const past7Dates = getPastDates(7).reverse();

  document.getElementById("current-date").textContent = formatDateDisplay();
  document.getElementById("active-id-badge").textContent = `ID: ${activeUserId}`;

  // 1. Profile & Shinobi Evolution
  const profile = currentUser.profile;
  document.getElementById("shinobi-display-name").textContent = profile.name;
  document.getElementById("shinobi-goal-display").textContent = `🎯 ${profile.specialty} • ${profile.goal}`;

  const currentStreak = calculateOverallStreak();
  const rankData = getHunterRank(currentStreak);

  document.getElementById("user-dp").src = rankData.avatar;
  document.getElementById("shinobi-rank-badge").textContent = rankData.rankText;
  document.getElementById("level-badge").textContent = `LEVEL ${rankData.level}`;
  document.getElementById("streak-days-count").textContent = currentStreak;
  document.getElementById("next-level-target").textContent = rankData.nextTarget;
  document.getElementById("level-prog-bar").style.width = `${rankData.progressToNext}%`;

  // 2. Today Focus Dial
  const todayTotal = tasks.length;
  const todayCompleted = completedToday.length;
  const todayPct = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;

  document.getElementById("today-fraction").textContent = `${todayCompleted}/${todayTotal}`;
  document.getElementById("today-pct").textContent = `${todayPct}%`;
  document.getElementById("today-ring").setAttribute("stroke-dasharray", `${todayPct}, 100`);

  const todayStatusEl = document.getElementById("today-status");
  if (todayTotal === 0) todayStatusEl.textContent = "Add your first habit";
  else if (todayPct >= 70) todayStatusEl.textContent = "🔥 Streak Secured (>70%)";
  else todayStatusEl.textContent = `Need ${Math.ceil(todayTotal * 0.7) - todayCompleted} more for streak (&ge;70%)`;

  // 3. Weekly & Monthly Progress
  const weekly = calculateProgress(7);
  document.getElementById("weekly-pct").textContent = `${weekly.percent}%`;
  document.getElementById("weekly-bar").style.width = `${weekly.percent}%`;
  document.getElementById("weekly-count").textContent = `${weekly.completed}/${weekly.totalPossible} logs`;

  const monthly = calculateProgress(30);
  document.getElementById("monthly-pct").textContent = `${monthly.percent}%`;
  document.getElementById("monthly-bar").style.width = `${monthly.percent}%`;
  document.getElementById("monthly-count").textContent = `${monthly.completed}/${monthly.totalPossible} logs`;

  // 4. Render Task Items
  taskListEl.innerHTML = "";
  if (tasks.length === 0) {
    emptyStateEl.classList.remove("hidden");
  } else {
    emptyStateEl.classList.add("hidden");

    tasks.forEach(task => {
      const isDone = completedToday.includes(task.id);

      const miniHeatmap = past7Dates.map(date => {
        const d = new Date(date + "T00:00:00");
        const dayLetter = d.toLocaleDateString(undefined, { weekday: 'narrow' });
        const doneOnDate = completionHistory[date] && completionHistory[date].includes(task.id);
        const isCurrent = date === today;

        return `
          <div class="flex flex-col items-center gap-1" title="${date}: ${doneOnDate ? 'Done' : 'Missed'}">
            <span class="text-[9px] font-semibold text-slate-500">${dayLetter}</span>
            <span class="w-2.5 h-2.5 rounded-sm transition-all duration-150 ${
              doneOnDate 
                ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.7)]' 
                : 'bg-slate-800 border border-slate-700/50'
            } ${isCurrent ? 'ring-1 ring-slate-400' : ''}"></span>
          </div>
        `;
      }).join('');

      const li = document.createElement("li");
      li.className = "task-row flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl gap-3.5 shadow-md";

      li.innerHTML = `
        <div class="flex items-center gap-3.5 flex-1 min-w-0">
          <input
            type="checkbox"
            class="custom-checkbox"
            ${isDone ? "checked" : ""}
            onchange="toggleTask(${task.id})"
          />
          <span class="text-sm font-semibold truncate select-none ${isDone ? "completed-text" : "text-slate-200"}">
            ${task.title}
          </span>
        </div>

        <div class="flex items-center justify-between sm:justify-end gap-3.5 pl-9 sm:pl-0">
          <div class="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800/70">
            ${miniHeatmap}
          </div>

          <button
            onclick="deleteTask(${task.id})"
            class="text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 p-2 rounded-xl transition text-xs"
            title="Delete Quest"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
        </div>
      `;
      taskListEl.appendChild(li);
    });
  }
}

// --- 9. Form Submission Binding ---
document.getElementById("add-task-form").addEventListener("submit", e => {
  e.preventDefault();
  const input = document.getElementById("task-input");
  if (input.value.trim()) {
    addTask(input.value);
    input.value = "";
  }
});

// Boot the application
render();