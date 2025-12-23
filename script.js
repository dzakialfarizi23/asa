let tasks = [];

// Set minimum date to today
window.addEventListener("DOMContentLoaded", () => {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("deadline").min = today;
  document.getElementById("deadline").value = today;
});

function addTask() {
  const name = document.getElementById("name").value.trim();
  const deadline = document.getElementById("deadline").value;
  const duration = parseInt(document.getElementById("duration").value);
  const priority = parseInt(document.getElementById("priority").value);

  if (!name || !deadline || isNaN(duration) || isNaN(priority)) {
    alert("⚠️ Mohon isi semua field dengan benar!");
    return;
  }

  if (duration <= 0) {
    alert("⚠️ Estimasi waktu pengerjaan harus lebih dari 0 jam!");
    return;
  }

  // Hitung berapa hari dari sekarang
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  const daysUntilDeadline = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));

  tasks.push({
    name,
    deadline,
    deadlineDate,
    daysUntilDeadline,
    duration, // dalam jam
    remaining: duration,
    priority,
    waiting: 0,
    turnaround: 0,
  });

  updateTaskTable();
  clearInputs();
  hideEmptyState();
}

function updateTaskTable() {
  const tbody = document.querySelector("#taskTable tbody");
  tbody.innerHTML = "";

  // Sort by deadline (paling dekat dulu)
  const sortedTasks = [...tasks].sort((a, b) => a.deadlineDate - b.deadlineDate);

  sortedTasks.forEach((task) => {
    const row = tbody.insertRow();

    const priorityText = task.priority === 1 ? "⭐⭐⭐ Sangat Penting" : task.priority === 2 ? "⭐⭐ Penting" : "⭐ Normal";
    const priorityClass = task.priority === 1 ? "priority-high" : task.priority === 2 ? "priority-medium" : "priority-low";

    const deadlineFormatted = new Date(task.deadline).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    row.innerHTML = `
      <td style="text-align: left; font-weight: 600;">${task.name}</td>
      <td>${deadlineFormatted}<br><small style="color: #718096;">(${task.daysUntilDeadline} hari lagi)</small></td>
      <td>${task.duration} jam</td>
      <td class="${priorityClass}">${priorityText}</td>
      <td><span class="status-badge status-pending">⏳ Menunggu</span></td>
    `;
  });
}

function hideEmptyState() {
  const emptyState = document.getElementById("emptyState");
  if (tasks.length > 0) {
    emptyState.style.display = "none";
  } else {
    emptyState.style.display = "block";
  }
}

function clearInputs() {
  document.getElementById("name").value = "";
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("deadline").value = today;
  document.getElementById("duration").value = "";
  document.getElementById("priority").selectedIndex = 0;
  document.getElementById("name").focus();
}

function runScheduling() {
  if (tasks.length === 0) {
    alert("⚠️ Tambahkan tugas terlebih dahulu!");
    return;
  }

  const quantum = parseInt(document.getElementById("quantum").value);

  if (isNaN(quantum) || quantum <= 0) {
    alert("⚠️ Waktu per sesi harus lebih dari 0 jam!");
    return;
  }

  // Reset semua tugas
  tasks.forEach((task) => {
    task.remaining = task.duration;
    task.waiting = 0;
    task.turnaround = 0;
  });

  let time = 0; // dalam jam
  let completed = 0;
  let gantt = [];
  let ganttTimes = [];

  // Sort berdasarkan deadline terdekat untuk arrival time
  tasks.sort((a, b) => a.daysUntilDeadline - b.daysUntilDeadline);

  while (completed < tasks.length) {
    // Ambil tugas yang sudah "tiba" (deadline masih ada waktu)
    let readyQueue = tasks.filter((t) => t.remaining > 0);

    // Urutkan berdasarkan priority (1 = tertinggi)
    readyQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      // Jika priority sama, pilih yang deadline lebih dekat
      return a.daysUntilDeadline - b.daysUntilDeadline;
    });

    if (readyQueue.length === 0) {
      break;
    }

    // Ambil priority tertinggi
    let highestPriority = readyQueue[0].priority;
    let samePriority = readyQueue.filter((t) => t.priority === highestPriority);

    // Round Robin untuk priority yang sama
    for (let task of samePriority) {
      if (task.remaining > 0) {
        let execTime = Math.min(quantum, task.remaining);
        let startTime = time;
        gantt.push(task.name);
        ganttTimes.push(`${startTime}-${startTime + execTime}h`);
        time += execTime;
        task.remaining -= execTime;

        // Update waiting time tugas lain
        tasks.forEach((t) => {
          if (t !== task && t.remaining > 0) {
            t.waiting += execTime;
          }
        });

        if (task.remaining === 0) {
          completed++;
          task.turnaround = time;
        }
      }
    }
  }

  displayResults(gantt, ganttTimes);
}

function displayResults(gantt, ganttTimes) {
  // Tampilkan section hasil
  document.getElementById("resultSection").style.display = "block";

  // Gantt Chart
  const ganttChart = document.getElementById("ganttChart");
  let ganttText = "Timeline Pengerjaan:\n\n";
  for (let i = 0; i < gantt.length; i++) {
    ganttText += `${gantt[i]} [${ganttTimes[i]}]`;
    if (i < gantt.length - 1) ganttText += " → ";
    if ((i + 1) % 3 === 0 && i < gantt.length - 1) ganttText += "\n";
  }
  ganttChart.textContent = ganttText;

  // Task Details
  const detailsDiv = document.getElementById("taskDetails");
  detailsDiv.innerHTML = "";

  // Sort berdasarkan urutan asli (deadline)
  const sortedTasks = [...tasks].sort((a, b) => a.deadlineDate - b.deadlineDate);

  sortedTasks.forEach((task) => {
    const item = document.createElement("div");
    item.className = "task-detail-item";
    item.innerHTML = `
      <div class="task-name">${task.name}</div>
      <div class="task-stats">
        <span>⏱️ Tunggu: ${task.waiting} jam</span>
        <span>🏁 Total: ${task.turnaround} jam</span>
      </div>
    `;
    detailsDiv.appendChild(item);
  });

  // Hitung rata-rata
  let totalWT = 0,
    totalTAT = 0;
  tasks.forEach((task) => {
    totalWT += task.waiting;
    totalTAT += task.turnaround;
  });

  document.getElementById("avgWT").textContent = (totalWT / tasks.length).toFixed(1);
  document.getElementById("avgTAT").textContent = (totalTAT / tasks.length).toFixed(1);

  // Scroll ke hasil
  setTimeout(() => {
    document.getElementById("resultSection").scrollIntoView({ behavior: "smooth", block: "start" });
  }, 100);
}

// Initialize
hideEmptyState();
