// ============================================================
// Assignment Portal — shared frontend logic (js/script.js)
// Every page includes this one file and calls the init that
// matches <body data-page="...">.
// ============================================================
const API = 'php';

// ---------- generic helpers ----------
function $(sel, root = document) { return root.querySelector(sel); }
function $all(sel, root = document) { return root.querySelectorAll(sel); }

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function showToast(msg, isError = false) {
  let t = $('#toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    t.hidden = true;
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.toggle('error-toast', isError);
  t.hidden = false;
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => (t.hidden = true), 3200);
}

async function api(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = {};
  if (!isForm && body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API}/${path}`, {
    method,
    headers,
    credentials: 'same-origin',
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

function fmtDate(sql) {
  if (!sql) return '';
  const d = new Date(sql.replace(' ', 'T'));
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtDateShort(sql) {
  if (!sql) return '';
  const d = new Date(sql.replace(' ', 'T'));
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function toInputDatetime(sql) {
  if (!sql) return '';
  return sql.replace(' ', 'T').slice(0, 16);
}
function isOverdue(sql) {
  return new Date(sql.replace(' ', 'T')) < new Date();
}

// live countdown text, e.g. "2d 4h left" / "3h 12m left" / "Overdue by 1d"
function countdownText(sql) {
  const target = new Date(sql.replace(' ', 'T'));
  const now = new Date();
  let diff = target - now;
  const overdue = diff < 0;
  diff = Math.abs(diff);

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);

  let text;
  if (days > 0) text = `${days}d ${hours}h`;
  else if (hours > 0) text = `${hours}h ${mins}m`;
  else text = `${mins}m`;

  return overdue ? `Overdue by ${text}` : `${text} left`;
}
function countdownClass(sql) {
  const target = new Date(sql.replace(' ', 'T'));
  const now = new Date();
  const diff = target - now;
  if (diff < 0) return 'past';
  if (diff < 1000 * 60 * 60 * 24) return 'urgent'; // under 24h
  return '';
}

function debounce(fn, wait = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// ============================================================
// AUTH GUARD + SHARED TOPBAR
// ============================================================
let CURRENT_USER = null;

// Small helper so a single dropped request right after login doesn't
// bounce the user straight back to the login page (this was the cause
// of the login <-> dashboard flicker: the very first session check after
// a fresh login could lose the race with the cookie being written, so
// one quick retry before giving up avoids a false "not logged in").
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function guardPage(requiredRole = null) {
  let session;
  try {
    session = await api('session.php');
  } catch (err) {
    await wait(300);
    try {
      session = await api('session.php');
    } catch (err2) {
      window.location.href = 'index.html';
      return null;
    }
  }

  const { user } = session;
  CURRENT_USER = user;
  if (requiredRole && user.role !== requiredRole) {
    window.location.href = 'dashboard.html';
    return null;
  }
  initTopbar(user);
  document.body.classList.add('auth-ready');
  return user;
}

function initTopbar(user) {
  const who = $('#whoami');
  if (who) who.textContent = `${user.name} · ${user.role}`;

  const logoutBtn = $('#logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await api('logout.php', { method: 'POST' });
      window.location.href = 'index.html';
    });
  }

  // hide teacher-only nav links for students, and student-only widgets for teachers
  if (user.role === 'student') {
    $all('[data-role="teacher-only"]').forEach((el) => (el.hidden = true));
  } else {
    $all('[data-role="student-only"]').forEach((el) => (el.hidden = true));
  }

  // mark current page's nav item active
  const page = document.body.dataset.page;
  $all('.nav-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.nav === page);
  });

  loadNotifications();
  initMobileNav();
}

// hamburger toggle for the collapsed nav (<=900px — see CSS)
function initMobileNav() {
  const toggle = $('#navToggle');
  const nav = $('#topbarNav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  // close after picking a link, and if the viewport grows past the breakpoint
  nav.querySelectorAll('.nav-item').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
}

// ============================================================
// NOTIFICATIONS (computed client-side from assignment data —
// no separate notifications table needed)
// ============================================================
async function loadNotifications() {
  const bell = $('#notifBell');
  if (!bell) return;

  try {
    const rows = await api('get-assignments.php');
    const upcoming = [];

    rows.forEach((a) => {
      const target = new Date(a.deadline.replace(' ', 'T'));
      const hoursLeft = (target - new Date()) / 3600000;

      if (CURRENT_USER.role === 'student') {
        if (!a.submission_id && hoursLeft > 0 && hoursLeft < 72) {
          upcoming.push({ title: a.title, when: countdownText(a.deadline) });
        }
      } else {
        // teacher: flag assignments with unreviewed submissions
        if (a.submission_count > 0 && a.reviewed_count < a.submission_count) {
          upcoming.push({
            title: a.title,
            when: `${a.submission_count - a.reviewed_count} awaiting review`,
          });
        }
      }
    });

    $('#notifDot').hidden = upcoming.length === 0;

    const list = $('#notifList');
    if (upcoming.length === 0) {
      list.innerHTML = '<p class="notif-empty">Nothing needs your attention right now.</p>';
    } else {
      list.innerHTML = upcoming
        .map((n) => `<div class="notif-item"><strong>${escapeHtml(n.title)}</strong><span class="notif-when">${escapeHtml(n.when)}</span></div>`)
        .join('');
    }
  } catch (err) {
    /* silent — notifications are a nice-to-have */
  }
}

document.addEventListener('click', (e) => {
  const wrap = $('.notif-wrap');
  if (!wrap) return;
  const dropdown = $('#notifDropdown');
  if (wrap.contains(e.target)) {
    if (e.target.closest('#notifBell')) dropdown.hidden = !dropdown.hidden;
  } else {
    dropdown.hidden = true;
  }
});

// ============================================================
// SIMPLE SVG CHARTS (no external library / CDN needed)
// ============================================================
function drawDonutChart(containerId, segments) {
  // segments: [{ label, value, color }]
  const el = document.getElementById(containerId);
  if (!el) return;
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  if (total === 0) {
    el.innerHTML = '<p class="notif-empty">No data yet.</p>';
    return;
  }

  const r = 60, cx = 70, cy = 70, circumference = 2 * Math.PI * r;
  let offset = 0;
  const circles = segments
    .map((seg) => {
      const frac = seg.value / total;
      const dash = frac * circumference;
      const circle = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="20"
        stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})" />`;
      offset += dash;
      return circle;
    })
    .join('');

  const legend = segments
    .map((seg) => `<div class="chart-legend-item"><span class="chart-legend-dot" style="background:${seg.color}"></span>${escapeHtml(seg.label)}: ${seg.value}</div>`)
    .join('');

  el.innerHTML = `
    <svg viewBox="0 0 140 140" style="max-width:180px; margin:0 auto; display:block;">${circles}
      <text x="70" y="75" text-anchor="middle" font-family="Sora, sans-serif" font-weight="800" font-size="26" fill="#0b1f42">${total}</text>
    </svg>
    <div class="chart-legend">${legend}</div>
  `;
}

function drawBarChart(containerId, bars) {
  // bars: [{ label, value, color }]
  const el = document.getElementById(containerId);
  if (!el) return;

  if (bars.length === 0) {
    el.innerHTML = '<p class="notif-empty">No data yet.</p>';
    return;
  }

  const max = Math.max(...bars.map((b) => b.value), 1);
  el.innerHTML = bars
    .map(
      (b) => `
      <div style="margin-bottom:10px;">
        <div style="display:flex; justify-content:space-between; font-size:12.5px; color:#4b5872; margin-bottom:4px;">
          <span>${escapeHtml(b.label)}</span><span style="font-family:'IBM Plex Mono',monospace; font-weight:700; color:#101a2e;">${b.value}</span>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${(b.value / max) * 100}%; background:${b.color}"></div></div>
      </div>`
    )
    .join('');
}

// ============================================================
// PAGE: index.html — login / register
// ============================================================
function initIndexPage() {
  // if already logged in, skip straight to dashboard; otherwise reveal
  // the login card. Keeping the card hidden until this resolves avoids
  // a flash of the login form for users who are already signed in.
  api('session.php')
    .then(() => (window.location.href = 'dashboard.html'))
    .catch(() => document.body.classList.add('auth-ready'));

  $all('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      $all('.tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const isLogin = tab.dataset.tab === 'login';
      $('#loginForm').hidden = !isLogin;
      $('#registerForm').hidden = isLogin;
    });
  });

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = $('#loginError');
    errEl.textContent = '';
    try {
      await api('login.php', {
        method: 'POST',
        body: { email: $('#loginEmail').value.trim(), password: $('#loginPassword').value },
      });
      window.location.href = 'dashboard.html';
    } catch (err) {
      errEl.textContent = err.message;
    }
  });

  $('#registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = $('#registerError');
    errEl.textContent = '';
    const role = [...$all('input[name="role"]')].find((r) => r.checked).value;
    try {
      await api('register.php', {
        method: 'POST',
        body: {
          name: $('#regName').value.trim(),
          email: $('#regEmail').value.trim(),
          password: $('#regPassword').value,
          role,
        },
      });
      window.location.href = 'dashboard.html';
    } catch (err) {
      errEl.textContent = err.message;
    }
  });
}

// ============================================================
// PAGE: dashboard.html
// ============================================================
async function initDashboardPage() {
  const user = await guardPage();
  if (!user) return;

  $('#dashRoleLabel').textContent = user.role === 'teacher' ? 'Teacher desk' : 'Student desk';
  $('#dashWelcome').textContent = `Welcome back, ${user.name.split(' ')[0]}`;

  try {
    const rows = await api('get-assignments.php');

    if (user.role === 'teacher') {
      const totalSubmissions = rows.reduce((s, a) => s + Number(a.submission_count), 0);
      const reviewed = rows.reduce((s, a) => s + Number(a.reviewed_count), 0);
      const pendingReview = totalSubmissions - reviewed;
      const overdue = rows.filter((a) => isOverdue(a.deadline)).length;

      $('#statTotal').textContent = rows.length;
      $('#statCompleted').textContent = reviewed;
      $('#statPending').textContent = pendingReview;
      $('#statUpcoming').textContent = overdue;
      $('#statCompletedLabel').textContent = 'Reviewed submissions';
      $('#statPendingLabel').textContent = 'Awaiting review';
      $('#statUpcomingLabel').textContent = 'Overdue assignments';

      drawDonutChart('donutChart', [
        { label: 'Reviewed', value: reviewed, color: '#0b1f42' },
        { label: 'Pending review', value: pendingReview, color: '#c8202e' },
      ]);
      drawBarChart(
        'barChart',
        rows.slice(0, 6).map((a) => ({ label: a.title, value: Number(a.submission_count), color: '#2f6fce' }))
      );
    } else {
      let completed = 0, pending = 0, upcomingSoon = 0;
      rows.forEach((a) => {
        if (!a.submission_id) {
          pending++;
          const hrs = (new Date(a.deadline.replace(' ', 'T')) - new Date()) / 3600000;
          if (hrs > 0 && hrs < 72) upcomingSoon++;
        } else completed++;
      });

      $('#statTotal').textContent = rows.length;
      $('#statCompleted').textContent = completed;
      $('#statPending').textContent = pending;
      $('#statUpcoming').textContent = upcomingSoon;
      $('#statCompletedLabel').textContent = 'Completed';
      $('#statPendingLabel').textContent = 'Pending';
      $('#statUpcomingLabel').textContent = 'Due within 3 days';

      drawDonutChart('donutChart', [
        { label: 'Completed', value: completed, color: '#0b1f42' },
        { label: 'Pending', value: pending, color: '#c8202e' },
      ]);

      const pct = rows.length ? Math.round((completed / rows.length) * 100) : 0;
      $('#progressPct').textContent = `${pct}%`;
      $('#progressFill').style.width = `${pct}%`;
    }

    // recent/upcoming list (both roles)
    const upcomingRows = rows
      .filter((a) => !isOverdue(a.deadline))
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      .slice(0, 5);
    const list = $('#upcomingList');
    if (upcomingRows.length === 0) {
      list.innerHTML = '<p class="notif-empty">No upcoming deadlines.</p>';
    } else {
      list.innerHTML = upcomingRows
        .map(
          (a) => `
        <div class="submission-row">
          <div class="submission-top">
            <div>
              <div class="submission-name">${escapeHtml(a.title)}</div>
              <div class="submission-date">${escapeHtml(a.subject || '')}</div>
            </div>
            <span class="countdown ${countdownClass(a.deadline)}">${countdownText(a.deadline)}</span>
          </div>
        </div>`
        )
        .join('');
    }
  } catch (err) {
    showToast(err.message, true);
  }
}

// ============================================================
// PAGE: assignments.html — list with search + filters
// ============================================================
let ALL_ASSIGNMENTS = [];

async function initAssignmentsPage() {
  const user = await guardPage();
  if (!user) return;

  try {
    ALL_ASSIGNMENTS = await api('get-assignments.php');
    populateSubjectFilter(ALL_ASSIGNMENTS);
    renderAssignmentsList(ALL_ASSIGNMENTS, user);
  } catch (err) {
    showToast(err.message, true);
  }

  $('#searchInput').addEventListener('input', debounce(applyFilters, 200));
  $('#subjectFilter').addEventListener('change', applyFilters);
  $('#statusFilter').addEventListener('change', applyFilters);
}

function populateSubjectFilter(rows) {
  const subjects = [...new Set(rows.map((a) => a.subject).filter(Boolean))];
  const sel = $('#subjectFilter');
  subjects.forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    sel.appendChild(opt);
  });
}

function assignmentStatus(a, role) {
  if (role === 'teacher') {
    if (a.submission_count == 0) return 'no-submissions';
    return a.reviewed_count == a.submission_count ? 'reviewed' : 'in-progress';
  }
  if (!a.submission_id) return 'pending';
  return a.submission_status === 'reviewed' ? 'reviewed' : 'submitted';
}

function applyFilters() {
  const q = $('#searchInput').value.trim().toLowerCase();
  const subject = $('#subjectFilter').value;
  const status = $('#statusFilter').value;

  const filtered = ALL_ASSIGNMENTS.filter((a) => {
    if (q && !a.title.toLowerCase().includes(q) && !(a.subject || '').toLowerCase().includes(q)) return false;
    if (subject && a.subject !== subject) return false;
    if (status && assignmentStatus(a, CURRENT_USER.role) !== status) return false;
    return true;
  });
  renderAssignmentsList(filtered, CURRENT_USER);
}

function renderAssignmentsList(rows, user) {
  const wrap = $('#assignmentsList');
  $('#assignmentsEmpty').hidden = rows.length > 0;
  if (rows.length === 0) { wrap.innerHTML = ''; return; }

  wrap.innerHTML = rows
    .map((a) => {
      const status = assignmentStatus(a, user.role);
      const statusLabel = {
        pending: 'Not submitted', submitted: 'Submitted', reviewed: 'Reviewed',
        'no-submissions': 'No submissions', 'in-progress': 'In progress',
      }[status];
      const pillClass = { pending: 'pending', submitted: 'submitted', reviewed: 'reviewed', 'no-submissions': 'pending', 'in-progress': 'submitted' }[status];

      return `
      <a href="assignment-details.html?id=${a.id}" class="assign-card status-${status === 'pending' || status === 'no-submissions' ? 'pending' : status === 'reviewed' ? 'reviewed' : 'submitted'}" style="text-decoration:none; color:inherit; display:flex;">
        <div class="assign-card-top">
          <div>
            <h3>${escapeHtml(a.title)}</h3>
            ${a.subject ? `<span class="assign-subject">${escapeHtml(a.subject)}</span>` : ''}
          </div>
          <span class="status-pill ${pillClass}">${statusLabel}</span>
        </div>
        <div class="assign-meta">
          <span>${user.role === 'student' ? 'By ' + escapeHtml(a.teacher_name || '') : (a.submission_count + ' submission(s)')}</span>
          <span class="countdown ${countdownClass(a.deadline)}">${countdownText(a.deadline)}</span>
        </div>
      </a>`;
    })
    .join('');
}

// ============================================================
// PAGE: assignment-details.html
// ============================================================
async function initAssignmentDetailsPage() {
  const user = await guardPage();
  if (!user) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) { window.location.href = 'assignments.html'; return; }

  try {
    const a = await api(`get-assignment.php?id=${id}`);

    $('#detailTitle').textContent = a.title;
    $('#detailSubject').textContent = a.subject || 'General';
    $('#detailDeadline').textContent = fmtDate(a.deadline);
    $('#detailCountdown').textContent = countdownText(a.deadline);
    $('#detailCountdown').className = `countdown ${countdownClass(a.deadline)}`;
    $('#detailDescription').textContent = a.description || 'No description provided.';
    $('#detailInstructions').textContent = a.instructions || 'No additional instructions.';

    if (a.attachment_path) {
      $('#detailAttachmentWrap').hidden = false;
      const link = $('#detailAttachmentLink');
      link.href = `php/download.php?type=assignment&id=${a.id}`;
      link.textContent = `⬇ ${a.attachment_name || 'Attachment'}`;
    }

    if (user.role === 'student') {
      $('#studentPanel').hidden = false;
      if (a.submission_id) {
        $('#submissionStatusBlock').hidden = false;
        $('#submissionFileLink').href = `php/download.php?type=submission&id=${a.submission_id}`;
        $('#submissionFileLink').textContent = `⬇ ${a.original_name}`;
        $('#submissionDate').textContent = `Submitted ${fmtDate(a.submitted_at)}`;
        $('#goSubmitBtn').textContent = 'Re-submit work';

        if (a.remark || a.grade) {
          $('#remarkBlock').hidden = false;
          $('#remarkGrade').textContent = a.grade || '';
          $('#remarkGrade').hidden = !a.grade;
          $('#remarkText').textContent = a.remark || '';
        }
      }
      $('#goSubmitBtn').addEventListener('click', () => {
        window.location.href = `submit-assignment.html?id=${a.id}`;
      });
    } else {
      $('#teacherPanel').hidden = false;
      $('#submissionCount').textContent = a.submission_count ?? 0;
      $('#viewSubmissionsBtn').addEventListener('click', () => {
        window.location.href = `teacher-panel.html?view=${a.id}`;
      });
      $('#editAssignmentBtn').addEventListener('click', () => {
        window.location.href = `teacher-panel.html?edit=${a.id}`;
      });
      $('#deleteAssignmentBtn').addEventListener('click', () => deleteAssignmentFlow(a.id));
    }
  } catch (err) {
    showToast(err.message, true);
  }
}

async function deleteAssignmentFlow(id) {
  if (!confirm('Delete this assignment? This cannot be undone.')) return;
  try {
    await api('delete-assignment.php', { method: 'POST', body: { id } });
    showToast('Assignment deleted');
    window.location.href = 'teacher-panel.html';
  } catch (err) {
    showToast(err.message, true);
  }
}

// ============================================================
// PAGE: submit-assignment.html
// ============================================================
async function initSubmitAssignmentPage() {
  const user = await guardPage('student');
  if (!user) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) { window.location.href = 'assignments.html'; return; }

  try {
    const a = await api(`get-assignment.php?id=${id}`);
    $('#submitAssignmentTitle').textContent = a.title;
    $('#submitAssignmentMeta').textContent = `${a.subject || 'General'} · Due ${fmtDate(a.deadline)}`;
    if (a.student_comment) $('#commentInput').value = a.student_comment;
  } catch (err) {
    showToast(err.message, true);
    return;
  }

  const fileInput = $('#fileInput');
  const fileDrop = $('#fileDrop');
  fileDrop.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) {
      fileDrop.querySelector('.file-drop-text').innerHTML = `<span class="picked">✓ ${escapeHtml(fileInput.files[0].name)}</span>`;
    }
  });

  $('#submitAssignmentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = $('#submitError');
    errEl.textContent = '';

    if (!fileInput.files.length) {
      errEl.textContent = 'Please choose a file to upload';
      return;
    }

    const fd = new FormData();
    fd.append('assignment_id', id);
    fd.append('comment', $('#commentInput').value.trim());
    fd.append('file', fileInput.files[0]);

    try {
      await api('submit-assignment.php', { method: 'POST', body: fd, isForm: true });
      showToast('Assignment submitted successfully');
      window.location.href = `assignment-details.html?id=${id}`;
    } catch (err) {
      errEl.textContent = err.message;
    }
  });
}

// ============================================================
// PAGE: teacher-panel.html — create / edit / delete / submissions
// ============================================================
async function initTeacherPanelPage() {
  const user = await guardPage('teacher');
  if (!user) return;

  const params = new URLSearchParams(window.location.search);
  const editId = params.get('edit');
  const viewId = params.get('view');

  await loadTeacherPanelList();

  if (editId) loadAssignmentIntoForm(editId);
  if (viewId) openSubmissionsPanel(viewId);

  $('#assignmentForm').addEventListener('submit', handleAssignmentFormSubmit);
  $('#cancelEditBtn').addEventListener('click', resetAssignmentForm);

  const fileInput = $('#panelFileInput');
  const fileDrop = $('#panelFileDrop');
  if (fileDrop) {
    fileDrop.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length) {
        fileDrop.querySelector('.file-drop-text').innerHTML = `<span class="picked">✓ ${escapeHtml(fileInput.files[0].name)}</span>`;
      }
    });
  }
}

async function loadTeacherPanelList() {
  try {
    const rows = await api('get-assignments.php');
    const tbody = $('#panelTableBody');
    tbody.innerHTML = '';
    $('#panelEmpty').hidden = rows.length > 0;

    rows.forEach((a) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="row-title">${escapeHtml(a.title)}</td>
        <td class="mono">${escapeHtml(a.subject || '—')}</td>
        <td><span class="countdown ${countdownClass(a.deadline)}">${countdownText(a.deadline)}</span></td>
        <td><span class="count-badge">${a.submission_count}</span></td>
        <td style="text-align:right; white-space:nowrap;">
          <button class="link-btn" data-view="${a.id}">Submissions</button>
          <button class="icon-btn" data-edit="${a.id}" title="Edit">✎</button>
          <button class="icon-btn" data-del="${a.id}" title="Delete">✕</button>
        </td>`;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => openSubmissionsPanel(b.dataset.view)));
    tbody.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => loadAssignmentIntoForm(b.dataset.edit)));
    tbody.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => deleteFromPanel(b.dataset.del)));
  } catch (err) {
    showToast(err.message, true);
  }
}

async function deleteFromPanel(id) {
  if (!confirm('Delete this assignment? This cannot be undone.')) return;
  try {
    await api('delete-assignment.php', { method: 'POST', body: { id } });
    showToast('Assignment deleted');
    loadTeacherPanelList();
  } catch (err) {
    showToast(err.message, true);
  }
}

async function loadAssignmentIntoForm(id) {
  try {
    const a = await api(`get-assignment.php?id=${id}`);
    $('#formMode').textContent = 'Edit assignment';
    $('#panelAssignmentId').value = a.id;
    $('#panelTitle').value = a.title;
    $('#panelSubject').value = a.subject || '';
    $('#panelDescription').value = a.description || '';
    $('#panelInstructions').value = a.instructions || '';
    $('#panelDeadline').value = toInputDatetime(a.deadline);
    $('#cancelEditBtn').hidden = false;
    document.getElementById('assignmentForm').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    showToast(err.message, true);
  }
}

function resetAssignmentForm() {
  $('#formMode').textContent = 'New assignment';
  $('#assignmentForm').reset();
  $('#panelAssignmentId').value = '';
  $('#cancelEditBtn').hidden = true;
  $('#panelFormError').textContent = '';
}

async function handleAssignmentFormSubmit(e) {
  e.preventDefault();
  const errEl = $('#panelFormError');
  errEl.textContent = '';

  const id = $('#panelAssignmentId').value;
  const payload = {
    title: $('#panelTitle').value.trim(),
    subject: $('#panelSubject').value.trim(),
    description: $('#panelDescription').value.trim(),
    instructions: $('#panelInstructions').value.trim(),
    deadline: $('#panelDeadline').value.replace('T', ' '),
  };

  try {
    if (id) {
      await api('edit-assignment.php', { method: 'POST', body: { id, ...payload } });
      showToast('Assignment updated');
    } else {
      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => fd.append(k, v));
      const fileInput = $('#panelFileInput');
      if (fileInput && fileInput.files.length) fd.append('attachment', fileInput.files[0]);
      await api('add-assignment.php', { method: 'POST', body: fd, isForm: true });
      showToast('Assignment created');
    }
    resetAssignmentForm();
    loadTeacherPanelList();
  } catch (err) {
    errEl.textContent = err.message;
  }
}

async function openSubmissionsPanel(assignmentId) {
  const panel = $('#submissionsPanel');
  panel.hidden = false;
  $('#submissionsPanelList').innerHTML = '<p class="no-submissions">Loading…</p>';
  panel.scrollIntoView({ behavior: 'smooth' });

  try {
    const { assignment, submissions } = await api(`get-submissions.php?assignment_id=${assignmentId}`);
    $('#submissionsPanelTitle').textContent = `Submissions — ${assignment.title}`;
    const list = $('#submissionsPanelList');

    if (submissions.length === 0) {
      list.innerHTML = '<p class="no-submissions">No submissions yet.</p>';
      return;
    }

    list.innerHTML = submissions
      .map(
        (s) => `
      <div class="submission-row">
        <div class="submission-top">
          <div>
            <div class="submission-name">${escapeHtml(s.student_name)}</div>
            <div class="submission-date">${escapeHtml(s.student_email)} · submitted ${fmtDate(s.submitted_at)}</div>
          </div>
          <a class="file-link" href="php/download.php?type=submission&id=${s.id}" target="_blank">⬇ ${escapeHtml(s.original_name || 'file')}</a>
        </div>
        ${s.student_comment ? `<p style="font-size:12.5px; color:#4b5872; margin:0;">"${escapeHtml(s.student_comment)}"</p>` : ''}
        <form class="remark-form" data-id="${s.id}">
          <input type="text" class="grade-input" placeholder="Grade" value="${escapeHtml(s.grade || '')}" />
          <input type="text" placeholder="Remark for student..." value="${escapeHtml(s.remark || '')}" />
          <button type="submit">Save</button>
        </form>
      </div>`
      )
      .join('');

    list.querySelectorAll('.remark-form').forEach((form) => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = form.dataset.id;
        const grade = form.querySelector('.grade-input').value.trim();
        const remark = form.querySelector('input[type="text"]:not(.grade-input)').value.trim();
        try {
          await api('add-remark.php', { method: 'POST', body: { id, grade, remark } });
          showToast('Remark saved');
          loadTeacherPanelList();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    });
  } catch (err) {
    $('#submissionsPanelList').innerHTML = `<p class="no-submissions">${escapeHtml(err.message)}</p>`;
  }
}

// ============================================================
// PAGE: reports.html
// ============================================================
async function initReportsPage() {
  const user = await guardPage();
  if (!user) return;

  try {
    const data = await api('reports.php');

    if (user.role === 'teacher') {
      $('#reportTotal').textContent = data.total_assignments;
      $('#reportCompleted').textContent = data.summary.reviewed_count || 0;
      $('#reportPending').textContent = data.summary.pending_review_count || 0;

      drawDonutChart('reportDonut', [
        { label: 'Reviewed', value: Number(data.summary.reviewed_count || 0), color: '#0b1f42' },
        { label: 'Pending review', value: Number(data.summary.pending_review_count || 0), color: '#c8202e' },
      ]);

      const tbody = $('#studentProgressBody');
      if (data.students.length === 0) {
        $('#studentProgressEmpty').hidden = false;
      } else {
        tbody.innerHTML = data.students
          .map((s) => {
            const pct = data.total_assignments ? Math.round((s.submitted_count / data.total_assignments) * 100) : 0;
            return `
            <tr>
              <td class="row-title">${escapeHtml(s.name)}<span class="sub">${escapeHtml(s.email)}</span></td>
              <td class="mono">${s.submitted_count} / ${data.total_assignments}</td>
              <td class="mono">${s.reviewed_count}</td>
              <td class="progress-table">
                <div class="progress-row">
                  <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
                  <span class="progress-pct">${pct}%</span>
                </div>
              </td>
            </tr>`;
          })
          .join('');
      }
    } else {
      $('#reportTotal').textContent = data.total;
      $('#reportCompleted').textContent = data.completed;
      $('#reportPending').textContent = data.pending;

      drawDonutChart('reportDonut', [
        { label: 'Completed', value: data.completed, color: '#0b1f42' },
        { label: 'Pending', value: data.pending, color: '#c8202e' },
      ]);

      const tbody = $('#myProgressBody');
      if (data.assignments.length === 0) {
        $('#studentProgressEmpty').hidden = false;
      } else {
        tbody.innerHTML = data.assignments
          .map((a) => {
            const status = !a.submission_status ? 'Pending' : a.submission_status === 'reviewed' ? 'Reviewed' : 'Submitted';
            const pillClass = !a.submission_status ? 'pending' : a.submission_status === 'reviewed' ? 'reviewed' : 'submitted';
            return `
            <tr>
              <td class="row-title">${escapeHtml(a.title)}<span class="sub">${escapeHtml(a.subject || '')}</span></td>
              <td class="mono">${fmtDateShort(a.deadline)}</td>
              <td><span class="status-pill ${pillClass}">${status}</span></td>
              <td class="mono">${escapeHtml(a.grade || '—')}</td>
            </tr>`;
          })
          .join('');
      }
    }
  } catch (err) {
    showToast(err.message, true);
  }
}

// ============================================================
// DISPATCH — run the right init for the current page
// ============================================================
// Safety net: if something goes wrong before the auth check finishes
// (a script error, a hung request), never leave the page permanently
// invisible — reveal it after 2s no matter what.
setTimeout(() => document.body.classList.add('auth-ready'), 2000);

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  const handlers = {
    index: initIndexPage,
    dashboard: initDashboardPage,
    assignments: initAssignmentsPage,
    'assignment-details': initAssignmentDetailsPage,
    'submit-assignment': initSubmitAssignmentPage,
    'teacher-panel': initTeacherPanelPage,
    reports: initReportsPage,
  };
  if (handlers[page]) handlers[page]();
});
