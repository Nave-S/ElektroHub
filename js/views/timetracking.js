// ============================================
// ElektroHub – Zeiterfassung View
// ============================================

const TimeTrackingView = {
  // Timer state persists across navigation
  _timer: null,       // { running: true, projectId, projectTitle, employee, startedAt: Date }
  _intervalId: null,
  _monthFilter: null,  // { year, month } for month overview

  async render() {
    const [projects, allEntries] = await Promise.all([
      db.getAll(STORES.projects),
      db.getAll(STORES.timeEntries),
    ]);

    const today = todayISO();
    const todayEntries = allEntries.filter(e => e.date === today)
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

    const todayTotal = todayEntries.reduce((s, e) => s + (e.duration || 0), 0);

    // Week calculation (Mo-So)
    const now = new Date();
    const weekData = this._getWeekData(now, allEntries);

    // Month filter default
    if (!this._monthFilter) {
      this._monthFilter = { year: now.getFullYear(), month: now.getMonth() };
    }
    const mf = this._monthFilter;
    const monthEntries = allEntries.filter(e => {
      if (!e.date) return false;
      const d = new Date(e.date);
      return d.getFullYear() === mf.year && d.getMonth() === mf.month;
    }).sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

    const monthTotal = monthEntries.reduce((s, e) => s + (e.duration || 0), 0);

    // Project summary from month entries
    const projectSummary = this._getProjectSummary(monthEntries);

    // Month/year options (last 12 months)
    const monthOptions = this._getMonthOptions();

    // Active projects for dropdown
    const activeProjects = projects.filter(p => !['abgeschlossen', 'abgerechnet'].includes(p.status));

    // Timer display
    const timerRunning = this._timer && this._timer.running;
    const timerProjectLabel = timerRunning ? escapeHtml(this._timer.projectTitle || 'Kein Projekt') : '';
    const timerEmployeeLabel = timerRunning ? escapeHtml(this._timer.employee || '') : '';

    return `
      <div class="page-header">
        <div>
          <h2>Zeiterfassung</h2>
          <p class="page-subtitle">Arbeitszeiten erfassen und auswerten</p>
        </div>
        <div class="btn-group">
          <button class="btn btn-secondary" onclick="TimeTrackingView.showManualForm()">+ Manueller Eintrag</button>
        </div>
      </div>

      <!-- Timer Section -->
      <div class="card" style="margin-bottom:16px;">
        <div class="card-header">
          <h3>Timer</h3>
          ${timerRunning ? '<span class="badge badge-green">Läuft</span>' : ''}
        </div>
        <div style="display:flex; flex-wrap:wrap; gap:12px; align-items:flex-end; margin-bottom:16px;">
          <div class="form-group" style="flex:1; min-width:180px; margin-bottom:0;">
            <label>Projekt</label>
            <select id="timer-project" ${timerRunning ? 'disabled' : ''}>
              <option value="">– Kein Projekt –</option>
              ${activeProjects.map(p => `
                <option value="${p.id}" ${timerRunning && this._timer.projectId === p.id ? 'selected' : ''}>${escapeHtml(p.title)}</option>
              `).join('')}
            </select>
          </div>
          <div class="form-group" style="flex:1; min-width:150px; margin-bottom:0;">
            <label>Mitarbeiter</label>
            <input type="text" id="timer-employee" placeholder="Name" value="${timerRunning ? escapeHtml(this._timer.employee || '') : ''}" ${timerRunning ? 'disabled' : ''}>
          </div>
          <div style="display:flex; align-items:center; gap:16px;">
            <div id="timer-display" style="font-size:2rem; font-weight:700; font-variant-numeric:tabular-nums; min-width:130px; text-align:center;">
              ${timerRunning ? this._formatElapsed(this._timer.startedAt) : '00:00:00'}
            </div>
            <button class="btn ${timerRunning ? 'btn-danger' : 'btn-primary'}" id="timer-btn"
                    onclick="TimeTrackingView.toggleTimer()" style="min-width:100px; height:48px; font-size:1.1rem;">
              ${timerRunning ? 'Stopp' : 'Start'}
            </button>
          </div>
        </div>
        ${timerRunning ? `
          <p class="text-muted text-small">
            Gestartet um ${new Date(this._timer.startedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
            ${timerProjectLabel ? ` · Projekt: ${timerProjectLabel}` : ''}
            ${timerEmployeeLabel ? ` · ${timerEmployeeLabel}` : ''}
          </p>
        ` : ''}
      </div>

      <!-- Stats -->
      <div class="stats-grid" style="margin-bottom:16px;">
        <div class="stat-card">
          <span class="stat-label">Heute</span>
          <span class="stat-value">${todayTotal.toFixed(1)} Std.</span>
          <span class="stat-sub">${todayEntries.length} Einträge</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Diese Woche</span>
          <span class="stat-value">${weekData.total.toFixed(1)} Std.</span>
          <span class="stat-sub">KW ${weekData.kw}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">${MONTH_NAMES[mf.month]} ${mf.year}</span>
          <span class="stat-value">${monthTotal.toFixed(1)} Std.</span>
          <span class="stat-sub">${monthEntries.length} Einträge</span>
        </div>
      </div>

      <!-- Today's Entries -->
      <div class="card" style="margin-bottom:16px;">
        <div class="card-header">
          <h3>Heute – ${new Date().toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</h3>
        </div>
        ${todayEntries.length === 0 ?
          '<p class="text-muted text-small">Noch keine Einträge heute</p>' :
          `<div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Projekt</th>
                  <th>Mitarbeiter</th>
                  <th>Start</th>
                  <th>Ende</th>
                  <th>Pause</th>
                  <th>Dauer</th>
                  <th>Beschreibung</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${todayEntries.map(e => `
                  <tr>
                    <td><strong>${escapeHtml(e.projectTitle || '–')}</strong></td>
                    <td>${escapeHtml(e.employee || '–')}</td>
                    <td>${escapeHtml(e.startTime || '–')}</td>
                    <td>${escapeHtml(e.endTime || '–')}</td>
                    <td>${e.breakMinutes ? e.breakMinutes + ' Min.' : '–'}</td>
                    <td><strong>${(e.duration || 0).toFixed(1)} Std.</strong></td>
                    <td class="text-muted">${escapeHtml(e.description || '')}</td>
                    <td style="white-space:nowrap;">
                      <button class="btn-icon" onclick="TimeTrackingView.showManualForm('${e.id}')" title="Bearbeiten">✏️</button>
                      <button class="btn-icon" onclick="TimeTrackingView.removeEntry('${e.id}')" title="Löschen">🗑️</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="5" style="text-align:right;"><strong>Gesamt heute:</strong></td>
                  <td><strong>${todayTotal.toFixed(1)} Std.</strong></td>
                  <td colspan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>`
        }
      </div>

      <!-- Week Overview -->
      <div class="card" style="margin-bottom:16px;">
        <div class="card-header">
          <h3>Wochenübersicht – KW ${weekData.kw}</h3>
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Tag</th>
                <th>Datum</th>
                <th>Stunden</th>
                <th>Einträge</th>
                <th>Projekte</th>
              </tr>
            </thead>
            <tbody>
              ${weekData.days.map(day => `
                <tr ${day.isToday ? 'style="background:var(--bg-highlight, rgba(59,130,246,0.06));"' : ''}>
                  <td><strong>${day.dayName}</strong></td>
                  <td>${day.dateFormatted}</td>
                  <td><strong>${day.hours.toFixed(1)} Std.</strong></td>
                  <td>${day.count}</td>
                  <td class="text-muted text-small">${escapeHtml(day.projects.join(', ') || '–')}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="text-align:right;"><strong>Woche gesamt:</strong></td>
                <td><strong>${weekData.total.toFixed(1)} Std.</strong></td>
                <td>${weekData.totalCount}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- Month Filter & Entries -->
      <div class="card" style="margin-bottom:16px;">
        <div class="card-header">
          <h3>Monatsübersicht</h3>
          <select id="month-filter" onchange="TimeTrackingView.changeMonth(this.value)" style="min-width:180px;">
            ${monthOptions.map(opt => `
              <option value="${opt.value}" ${opt.value === `${mf.year}-${mf.month}` ? 'selected' : ''}>${opt.label}</option>
            `).join('')}
          </select>
        </div>
        ${monthEntries.length === 0 ?
          '<p class="text-muted text-small">Keine Einträge in diesem Monat</p>' :
          `<div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Projekt</th>
                  <th>Mitarbeiter</th>
                  <th>Start</th>
                  <th>Ende</th>
                  <th>Dauer</th>
                  <th>Beschreibung</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${monthEntries.map(e => `
                  <tr>
                    <td>${formatDate(e.date)}</td>
                    <td><strong>${escapeHtml(e.projectTitle || '–')}</strong></td>
                    <td>${escapeHtml(e.employee || '–')}</td>
                    <td>${escapeHtml(e.startTime || '–')}</td>
                    <td>${escapeHtml(e.endTime || '–')}</td>
                    <td><strong>${(e.duration || 0).toFixed(1)} Std.</strong></td>
                    <td class="text-muted">${escapeHtml(e.description || '')}</td>
                    <td style="white-space:nowrap;">
                      <button class="btn-icon" onclick="TimeTrackingView.showManualForm('${e.id}')" title="Bearbeiten">✏️</button>
                      <button class="btn-icon" onclick="TimeTrackingView.removeEntry('${e.id}')" title="Löschen">🗑️</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="5" style="text-align:right;"><strong>Monat gesamt:</strong></td>
                  <td><strong>${monthTotal.toFixed(1)} Std.</strong></td>
                  <td colspan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>`
        }
      </div>

      <!-- Project Summary -->
      <div class="card">
        <div class="card-header">
          <h3>Stunden pro Projekt – ${MONTH_NAMES[mf.month]} ${mf.year}</h3>
        </div>
        ${projectSummary.length === 0 ?
          '<p class="text-muted text-small">Keine Daten</p>' :
          `<div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Projekt</th>
                  <th>Einträge</th>
                  <th>Stunden</th>
                  <th>Anteil</th>
                </tr>
              </thead>
              <tbody>
                ${projectSummary.map(ps => `
                  <tr>
                    <td><strong>${escapeHtml(ps.title)}</strong></td>
                    <td>${ps.count}</td>
                    <td><strong>${ps.hours.toFixed(1)} Std.</strong></td>
                    <td>
                      <div style="display:flex; align-items:center; gap:8px;">
                        <div style="flex:1; background:var(--border-color, #e5e7eb); border-radius:4px; height:8px; max-width:120px;">
                          <div style="width:${monthTotal > 0 ? Math.round(ps.hours / monthTotal * 100) : 0}%; background:var(--primary, #3b82f6); border-radius:4px; height:100%;"></div>
                        </div>
                        <span class="text-small text-muted">${monthTotal > 0 ? Math.round(ps.hours / monthTotal * 100) : 0}%</span>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td style="text-align:right;"><strong>Gesamt:</strong></td>
                  <td>${projectSummary.reduce((s, p) => s + p.count, 0)}</td>
                  <td><strong>${monthTotal.toFixed(1)} Std.</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>`
        }
      </div>
    `;
  },

  init() {
    // Restart live display if timer is running
    if (this._timer && this._timer.running) {
      this._startLiveDisplay();
    }
  },

  // ── Timer ──────────────────────────────────────────

  async toggleTimer() {
    if (this._timer && this._timer.running) {
      await this._stopTimer();
    } else {
      this._startTimer();
    }
  },

  _startTimer() {
    const projectSelect = document.getElementById('timer-project');
    const employeeInput = document.getElementById('timer-employee');

    const projectId = projectSelect ? projectSelect.value : '';
    const projectTitle = projectSelect && projectSelect.value
      ? projectSelect.options[projectSelect.selectedIndex].text
      : '';
    const employee = employeeInput ? employeeInput.value.trim() : '';

    this._timer = {
      running: true,
      projectId: projectId || null,
      projectTitle: projectTitle,
      employee: employee,
      startedAt: new Date(),
    };

    this._startLiveDisplay();

    // Update UI without full re-render
    const btn = document.getElementById('timer-btn');
    if (btn) {
      btn.textContent = 'Stopp';
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-danger');
    }
    if (projectSelect) projectSelect.disabled = true;
    if (employeeInput) employeeInput.disabled = true;

    showToast('Timer gestartet');
  },

  async _stopTimer() {
    if (!this._timer || !this._timer.running) return;

    this._stopLiveDisplay();

    const startedAt = new Date(this._timer.startedAt);
    const endedAt = new Date();

    const startTime = startedAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const endTime = endedAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

    const diffMs = endedAt - startedAt;
    const diffHours = Math.round(diffMs / 1000 / 60 * 100) / 100 / 60; // hours rounded to 2 decimals

    // Prompt for break and description
    const html = `
      <form id="timer-stop-form">
        <div class="form-row">
          <div class="form-group">
            <label>Projekt</label>
            <input type="text" value="${escapeHtml(this._timer.projectTitle || 'Kein Projekt')}" disabled>
          </div>
          <div class="form-group">
            <label>Mitarbeiter</label>
            <input type="text" value="${escapeHtml(this._timer.employee || '–')}" disabled>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Startzeit</label>
            <input type="text" value="${startTime}" disabled>
          </div>
          <div class="form-group">
            <label>Endzeit</label>
            <input type="text" value="${endTime}" disabled>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Pause (Minuten)</label>
            <input type="number" name="breakMinutes" min="0" value="0" step="5">
            ${presetChips('breakMinutes', [0, 15, 30, 45, 60], ' Min.')}
          </div>
          <div class="form-group">
            <label>Dauer (berechnet)</label>
            <input type="text" id="timer-calc-duration" value="${diffHours.toFixed(1)} Std." disabled>
          </div>
        </div>
        <div class="form-group">
          <label>Beschreibung</label>
          <textarea name="description" rows="2" placeholder="Was wurde erledigt?"></textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="TimeTrackingView.discardTimer()">Verwerfen</button>
          <button type="submit" class="btn btn-primary">Speichern</button>
        </div>
      </form>
    `;

    openModal('Timer stoppen', html);

    // Update duration live when break changes
    const breakInput = document.querySelector('#timer-stop-form [name="breakMinutes"]');
    const durDisplay = document.getElementById('timer-calc-duration');
    if (breakInput && durDisplay) {
      breakInput.addEventListener('input', () => {
        const brk = parseInt(breakInput.value) || 0;
        const netMinutes = Math.max(0, diffMs / 1000 / 60 - brk);
        durDisplay.value = (Math.round(netMinutes / 60 * 100) / 100).toFixed(1) + ' Std.';
      });
    }

    document.getElementById('timer-stop-form').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const breakMin = parseInt(fd.get('breakMinutes')) || 0;
      const netMinutes = Math.max(0, diffMs / 1000 / 60 - breakMin);
      const duration = Math.round(netMinutes / 60 * 100) / 100;

      const entry = {
        id: generateId(),
        projectId: this._timer.projectId,
        projectTitle: this._timer.projectTitle,
        employee: this._timer.employee,
        date: startedAt.toISOString().split('T')[0],
        startTime: startTime,
        endTime: endTime,
        breakMinutes: breakMin,
        duration: duration,
        description: fd.get('description') || '',
        createdAt: new Date().toISOString(),
      };

      await db.put(STORES.timeEntries, entry);
      this._timer = null;
      closeModal();
      showToast('Zeiteintrag gespeichert');
      app.refresh();
    };
  },

  discardTimer() {
    this._timer = null;
    this._stopLiveDisplay();
    closeModal();
    showToast('Timer verworfen', 'info');
    app.refresh();
  },

  _startLiveDisplay() {
    this._stopLiveDisplay();
    this._intervalId = setInterval(() => {
      const display = document.getElementById('timer-display');
      if (display && this._timer && this._timer.running) {
        display.textContent = this._formatElapsed(this._timer.startedAt);
      }
    }, 1000);
  },

  _stopLiveDisplay() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  },

  _formatElapsed(startedAt) {
    const diff = Math.floor((new Date() - new Date(startedAt)) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  },

  // ── Manual Entry ───────────────────────────────────

  async showManualForm(editId) {
    const projects = await db.getAll(STORES.projects);
    const activeProjects = projects.filter(p => !['abgeschlossen', 'abgerechnet'].includes(p.status));
    let entry = editId ? await db.get(STORES.timeEntries, editId) : null;
    const isEdit = !!entry;

    const html = `
      <form id="time-entry-form">
        <div class="form-row">
          <div class="form-group">
            <label>Datum *</label>
            <input type="date" name="date" required value="${entry ? entry.date : todayISO()}">
          </div>
          <div class="form-group">
            <label>Projekt</label>
            <select name="projectId">
              <option value="">– Kein Projekt –</option>
              ${projects.map(p => `
                <option value="${p.id}" ${entry && entry.projectId === p.id ? 'selected' : ''}>${escapeHtml(p.title)}</option>
              `).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Startzeit *</label>
            <input type="time" name="startTime" required value="${entry ? entry.startTime : '08:00'}">
          </div>
          <div class="form-group">
            <label>Endzeit *</label>
            <input type="time" name="endTime" required value="${entry ? entry.endTime : '16:30'}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Mitarbeiter</label>
            <input type="text" name="employee" placeholder="Name" value="${escapeHtml(entry?.employee || '')}">
          </div>
          <div class="form-group">
            <label>Pause (Minuten)</label>
            <input type="number" name="breakMinutes" min="0" step="5" value="${entry ? (entry.breakMinutes || 0) : 30}">
            ${presetChips('breakMinutes', [0, 15, 30, 45, 60], ' Min.')}
          </div>
        </div>
        <div class="form-group">
          <label>Beschreibung</label>
          <textarea name="description" rows="2" placeholder="Tätigkeitsbeschreibung">${escapeHtml(entry?.description || '')}</textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
          ${isEdit ? `<button type="button" class="btn btn-danger" onclick="TimeTrackingView.removeEntry('${editId}'); closeModal();">Löschen</button>` : ''}
          <button type="submit" class="btn btn-primary">${isEdit ? 'Speichern' : 'Eintragen'}</button>
        </div>
      </form>
    `;

    openModal(isEdit ? 'Zeiteintrag bearbeiten' : 'Manueller Zeiteintrag', html);

    document.getElementById('time-entry-form').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);

      const startTime = fd.get('startTime');
      const endTime = fd.get('endTime');
      const breakMin = parseInt(fd.get('breakMinutes')) || 0;

      // Calculate duration
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      let totalMinutes = (eh * 60 + em) - (sh * 60 + sm) - breakMin;
      if (totalMinutes < 0) totalMinutes += 24 * 60; // overnight
      const duration = Math.round(totalMinutes / 60 * 100) / 100;

      if (duration <= 0) {
        showToast('Dauer muss positiv sein', 'error');
        return;
      }

      // Get project title
      const projectId = fd.get('projectId') || null;
      let projectTitle = '';
      if (projectId) {
        const proj = await db.get(STORES.projects, projectId);
        projectTitle = proj ? proj.title : '';
      }

      if (!isEdit) {
        entry = {
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
      }

      entry.projectId = projectId;
      entry.projectTitle = projectTitle;
      entry.employee = fd.get('employee') || '';
      entry.date = fd.get('date');
      entry.startTime = startTime;
      entry.endTime = endTime;
      entry.breakMinutes = breakMin;
      entry.duration = duration;
      entry.description = fd.get('description') || '';
      entry.updatedAt = new Date().toISOString();

      await db.put(STORES.timeEntries, entry);
      closeModal();
      showToast(isEdit ? 'Eintrag gespeichert' : 'Eintrag erstellt');
      app.refresh();
    };
  },

  async removeEntry(id) {
    if (!confirm('Zeiteintrag wirklich löschen?')) return;
    await db.delete(STORES.timeEntries, id);
    showToast('Eintrag gelöscht', 'info');
    app.refresh();
  },

  // ── Month Filter ───────────────────────────────────

  changeMonth(value) {
    const [year, month] = value.split('-').map(Number);
    this._monthFilter = { year, month };
    app.refresh();
  },

  // ── Helpers ────────────────────────────────────────

  _getWeekData(refDate, allEntries) {
    // Get Monday of the current week
    const d = new Date(refDate);
    const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon, ...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(d);
    monday.setDate(d.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const dayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    const todayStr = todayISO();
    const days = [];
    let total = 0;
    let totalCount = 0;

    // ISO week number
    const kw = this._getISOWeek(monday);

    for (let i = 0; i < 7; i++) {
      const current = new Date(monday);
      current.setDate(monday.getDate() + i);
      const dateStr = current.toISOString().split('T')[0];
      const dayEntries = allEntries.filter(e => e.date === dateStr);
      const hours = dayEntries.reduce((s, e) => s + (e.duration || 0), 0);
      const projectNames = [...new Set(dayEntries.map(e => e.projectTitle || 'Ohne Projekt'))];

      total += hours;
      totalCount += dayEntries.length;

      days.push({
        dayName: dayNames[i],
        dateFormatted: current.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
        dateISO: dateStr,
        isToday: dateStr === todayStr,
        hours: hours,
        count: dayEntries.length,
        projects: projectNames,
      });
    }

    return { days, total, totalCount, kw };
  },

  _getISOWeek(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const yearStart = new Date(d.getFullYear(), 0, 4);
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  },

  _getProjectSummary(entries) {
    const map = {};
    for (const e of entries) {
      const key = e.projectId || '_none';
      if (!map[key]) {
        map[key] = {
          title: e.projectTitle || 'Ohne Projekt',
          hours: 0,
          count: 0,
        };
      }
      map[key].hours += e.duration || 0;
      map[key].count += 1;
    }
    return Object.values(map).sort((a, b) => b.hours - a.hours);
  },

  _getMonthOptions() {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push({
        value: `${d.getFullYear()}-${d.getMonth()}`,
        label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
      });
    }
    return options;
  },
};
