// ============================================
// ElektroHub – Lagerverwaltung View
// ============================================

const InventoryView = {
  async render(detailId) {
    if (detailId) return this.renderDetail(detailId);
    return this.renderList();
  },

  async renderList() {
    const articles = await db.getAll(STORES.articles);

    return `
      <div class="page-header">
        <div>
          <h2>Lager</h2>
          <p class="page-subtitle">${articles.length} Artikel</p>
        </div>
        <div class="btn-group">
          <button class="btn btn-secondary" onclick="InventoryView.showImportCSV()">📥 CSV Import</button>
          <button class="btn btn-primary" onclick="InventoryView.showArticleForm()">+ Neuer Artikel</button>
        </div>
      </div>

      <div class="toolbar">
        <input type="text" class="search-input" placeholder="Artikel suchen (Name, EAN, Lieferant)..." id="article-search"
               oninput="InventoryView.filter()">
        <select class="filter-select" id="stock-filter" onchange="InventoryView.filter()">
          <option value="">Alle</option>
          <option value="low">Unter Mindestbestand</option>
          <option value="empty">Leer (0)</option>
        </select>
      </div>

      <div class="card">
        ${articles.length === 0 ?
          `<div class="empty-state">
            <div class="empty-icon">📦</div>
            <p>Noch keine Artikel im Lager</p>
            <button class="btn btn-primary" onclick="InventoryView.showArticleForm()">Ersten Artikel anlegen</button>
          </div>` :
          `<div class="table-wrapper">
            <table id="articles-table">
              <thead>
                <tr>
                  <th>Artikel</th>
                  <th>EAN</th>
                  <th>Lieferant</th>
                  <th>EK-Preis</th>
                  <th>VK-Preis</th>
                  <th>Bestand</th>
                  <th>Min.</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${articles.sort((a,b) => a.name.localeCompare(b.name)).map(a => {
                  const isLow = a.stock <= (a.minStock || 0);
                  const isEmpty = a.stock === 0;
                  return `
                    <tr class="clickable article-row"
                        data-name="${escapeHtml((a.name + ' ' + (a.ean||'') + ' ' + (a.supplier||'')).toLowerCase())}"
                        data-stock="${isEmpty ? 'empty' : (isLow ? 'low' : 'ok')}"
                        onclick="app.navigate('inventory', '${a.id}')">
                      <td><strong>${escapeHtml(a.name)}</strong>
                        ${a.location ? `<br><span class="text-small text-muted">${escapeHtml(a.location)}</span>` : ''}
                      </td>
                      <td class="text-small">${escapeHtml(a.ean || '–')}</td>
                      <td>${escapeHtml(a.supplier || '–')}</td>
                      <td>${formatCurrency(a.purchasePrice)}</td>
                      <td>${formatCurrency(a.salePrice)}</td>
                      <td>
                        <span class="badge ${isEmpty ? 'badge-red' : (isLow ? 'badge-yellow' : 'badge-green')}">${a.stock}</span>
                      </td>
                      <td>${a.minStock || 0}</td>
                      <td>
                        <div class="btn-group">
                          <button class="btn-icon" onclick="event.stopPropagation(); InventoryView.showMovementForm('${a.id}', 'in')" title="Zugang">📥</button>
                          <button class="btn-icon" onclick="event.stopPropagation(); InventoryView.showMovementForm('${a.id}', 'out')" title="Entnahme">📤</button>
                          <button class="btn-icon" onclick="event.stopPropagation(); InventoryView.showArticleForm('${a.id}')" title="Bearbeiten">✏️</button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>`
        }
      </div>
    `;
  },

  async renderDetail(id) {
    const article = await db.get(STORES.articles, id);
    if (!article) return '<p>Artikel nicht gefunden.</p>';
    const movements = await db.getByIndex(STORES.stockMovements, 'articleId', id);
    const isLow = article.stock <= (article.minStock || 0);

    return `
      <div class="detail-header">
        <div>
          <button class="btn btn-secondary btn-small mb-8" onclick="app.navigate('inventory')">← Zurück</button>
          <div class="detail-title">${escapeHtml(article.name)}</div>
          ${article.ean ? `<div class="detail-id">EAN: ${escapeHtml(article.ean)}</div>` : ''}
        </div>
        <div class="btn-group">
          <button class="btn btn-success" onclick="InventoryView.showMovementForm('${article.id}', 'in')">📥 Zugang</button>
          <button class="btn btn-primary" onclick="InventoryView.showMovementForm('${article.id}', 'out')">📤 Entnahme</button>
          <button class="btn btn-secondary" onclick="InventoryView.showArticleForm('${article.id}')">✏️ Bearbeiten</button>
          <button class="btn btn-danger" onclick="InventoryView.removeArticle('${article.id}')">Löschen</button>
        </div>
      </div>

      <div class="detail-meta">
        <div class="detail-meta-item">
          <div class="meta-label">Bestand</div>
          <div class="meta-value">
            <span class="badge ${isLow ? 'badge-red' : 'badge-green'}" style="font-size:1.2rem;padding:4px 16px;">${article.stock}</span>
          </div>
        </div>
        <div class="detail-meta-item">
          <div class="meta-label">Mindestbestand</div>
          <div class="meta-value">${article.minStock || 0}</div>
        </div>
        <div class="detail-meta-item">
          <div class="meta-label">EK-Preis</div>
          <div class="meta-value">${formatCurrency(article.purchasePrice)}</div>
        </div>
        <div class="detail-meta-item">
          <div class="meta-label">VK-Preis</div>
          <div class="meta-value">${formatCurrency(article.salePrice)}</div>
        </div>
        <div class="detail-meta-item">
          <div class="meta-label">Lieferant</div>
          <div class="meta-value">${escapeHtml(article.supplier || '–')}</div>
        </div>
        <div class="detail-meta-item">
          <div class="meta-label">Lagerort</div>
          <div class="meta-value">${escapeHtml(article.location || '–')}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>Lagerbewegungen (${movements.length})</h3>
        </div>
        ${movements.length === 0 ? '<p class="text-muted text-small">Keine Bewegungen</p>' :
          `<div class="table-wrapper">
            <table>
              <thead><tr><th>Datum</th><th>Typ</th><th>Menge</th><th>Projekt</th><th>Notiz</th></tr></thead>
              <tbody>
                ${movements.sort((a,b) => new Date(b.date) - new Date(a.date)).map(m => {
                  const typeLabel = m.type === 'in' ? '📥 Zugang' : m.type === 'out' ? '📤 Entnahme' : '🔄 Korrektur';
                  const qtyClass = m.type === 'in' ? 'badge-green' : m.type === 'out' ? 'badge-red' : 'badge-yellow';
                  const qtySign = m.type === 'in' ? '+' : m.type === 'out' ? '-' : '';
                  return `
                    <tr>
                      <td>${formatDate(m.date)}</td>
                      <td>${typeLabel}</td>
                      <td><span class="badge ${qtyClass}">${qtySign}${m.quantity}</span></td>
                      <td>${m.projectName ? escapeHtml(m.projectName) : '–'}</td>
                      <td class="text-muted text-small">${escapeHtml(m.note || '')}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>`
        }
      </div>
    `;
  },

  filter() {
    const search = document.getElementById('article-search').value.toLowerCase();
    const stockFilter = document.getElementById('stock-filter').value;
    document.querySelectorAll('.article-row').forEach(row => {
      const name = row.dataset.name;
      const stock = row.dataset.stock;
      const matchSearch = !search || name.includes(search);
      const matchStock = !stockFilter || stock === stockFilter || (stockFilter === 'low' && stock === 'empty');
      row.style.display = (matchSearch && matchStock) ? '' : 'none';
    });
  },

  async showArticleForm(editId) {
    let article = editId ? await db.get(STORES.articles, editId) : null;
    const isEdit = !!article;

    const html = `
      <form id="article-form">
        <div class="form-group">
          <label>Bezeichnung *</label>
          <input type="text" name="name" required value="${escapeHtml(article?.name || '')}" placeholder="z.B. NYM-J 3x1,5mm²">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>EAN / Barcode</label>
            <input type="text" name="ean" value="${escapeHtml(article?.ean || '')}">
          </div>
          <div class="form-group">
            <label>Lieferant</label>
            <input type="text" name="supplier" value="${escapeHtml(article?.supplier || '')}" placeholder="z.B. Sonepar">
          </div>
        </div>
        <div class="form-row-3">
          <div class="form-group">
            <label>EK-Preis (€)</label>
            <input type="number" name="purchasePrice" step="0.01" min="0" value="${article?.purchasePrice || 0}">
          </div>
          <div class="form-group">
            <label>VK-Preis (€)</label>
            <input type="number" name="salePrice" step="0.01" min="0" value="${article?.salePrice || 0}">
          </div>
          <div class="form-group">
            <label>Bestand</label>
            <input type="number" name="stock" min="0" value="${article?.stock || 0}" ${isEdit ? 'readonly style="background:var(--gray-100)"' : ''}>
            ${isEdit ? '<span class="text-small text-muted">Bestand über Zu-/Abgang ändern</span>' : ''}
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Mindestbestand</label>
            <input type="number" name="minStock" min="0" value="${article?.minStock || 0}">
          </div>
          <div class="form-group">
            <label>Lagerort</label>
            <input type="text" name="location" value="${escapeHtml(article?.location || '')}" placeholder="z.B. Regal A3">
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Speichern' : 'Anlegen'}</button>
        </div>
      </form>
    `;

    openModal(isEdit ? 'Artikel bearbeiten' : 'Neuer Artikel', html);

    document.getElementById('article-form').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);

      if (!isEdit) {
        article = {
          id: generateId(),
          createdAt: new Date().toISOString(),
          stock: parseInt(fd.get('stock')) || 0,
        };
      }

      article.name = fd.get('name');
      article.ean = fd.get('ean');
      article.supplier = fd.get('supplier');
      article.purchasePrice = parseFloat(fd.get('purchasePrice')) || 0;
      article.salePrice = parseFloat(fd.get('salePrice')) || 0;
      article.minStock = parseInt(fd.get('minStock')) || 0;
      article.location = fd.get('location');
      article.updatedAt = new Date().toISOString();

      await db.put(STORES.articles, article);
      closeModal();
      showToast(isEdit ? 'Artikel gespeichert' : 'Artikel angelegt');
      app.refresh();
    };
  },

  async showMovementForm(articleId, type) {
    const article = await db.get(STORES.articles, articleId);
    if (!article) return;
    const projects = await db.getAll(STORES.projects);
    const activeProjects = projects.filter(p => !['abgeschlossen'].includes(p.status));

    const typeLabel = type === 'in' ? 'Zugang' : 'Entnahme';

    const html = `
      <form id="movement-form">
        <p class="mb-16"><strong>${escapeHtml(article.name)}</strong> – aktueller Bestand: <span class="badge badge-blue">${article.stock}</span></p>
        <div class="form-row">
          <div class="form-group">
            <label>Menge *</label>
            <input type="number" name="quantity" min="1" value="1" required>
          </div>
          <div class="form-group">
            <label>Datum</label>
            <input type="date" name="date" value="${todayISO()}">
          </div>
        </div>
        ${type === 'out' ? `
          <div class="form-group">
            <label>Projekt (optional)</label>
            <select name="projectId">
              <option value="">– Kein Projekt –</option>
              ${activeProjects.map(p => `<option value="${p.id}">${escapeHtml(p.title)} (${p.projectId})</option>`).join('')}
            </select>
          </div>
        ` : ''}
        <div class="form-group">
          <label>Notiz</label>
          <input type="text" name="note" placeholder="Optional">
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
          <button type="submit" class="btn ${type === 'in' ? 'btn-success' : 'btn-primary'}">${typeLabel} buchen</button>
        </div>
      </form>
    `;

    openModal(`${typeLabel}: ${article.name}`, html);

    document.getElementById('movement-form').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const qty = parseInt(fd.get('quantity')) || 0;
      if (qty <= 0) { showToast('Menge muss > 0 sein', 'error'); return; }
      if (type === 'out' && qty > article.stock) {
        showToast('Nicht genug Bestand!', 'error');
        return;
      }

      const projectId = fd.get('projectId') || null;
      let projectName = '';
      if (projectId) {
        const proj = await db.get(STORES.projects, projectId);
        projectName = proj?.title || '';
      }

      const movement = {
        id: generateId(),
        articleId: article.id,
        articleName: article.name,
        type,
        quantity: qty,
        date: fd.get('date') || todayISO(),
        projectId,
        projectName,
        note: fd.get('note'),
        createdAt: new Date().toISOString(),
      };

      // Bestand aktualisieren
      article.stock = type === 'in' ? article.stock + qty : article.stock - qty;
      article.updatedAt = new Date().toISOString();

      await db.put(STORES.stockMovements, movement);
      await db.put(STORES.articles, article);
      closeModal();
      showToast(`${typeLabel} gebucht: ${qty}x ${article.name}`);
      app.refresh();
    };
  },

  showImportCSV() {
    const html = `
      <div>
        <p class="mb-16">CSV-Datei mit Artikeldaten importieren. Erwartete Spalten:</p>
        <code class="text-small" style="display:block;padding:8px;background:var(--gray-50);border-radius:4px;margin-bottom:16px;">
          Name;EAN;Lieferant;EK-Preis;VK-Preis;Bestand;Mindestbestand;Lagerort
        </code>
        <p class="text-small text-muted mb-16">Trennzeichen: Semikolon (;). Dezimalzeichen: Komma oder Punkt.</p>
        <div class="form-group">
          <label>CSV-Datei auswählen</label>
          <input type="file" accept=".csv,.txt" id="csv-file-input">
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
          <button type="button" class="btn btn-primary" onclick="InventoryView.processCSV()">Importieren</button>
        </div>
      </div>
    `;
    openModal('CSV Import', html);
  },

  async processCSV() {
    const input = document.getElementById('csv-file-input');
    if (!input.files.length) { showToast('Bitte Datei auswählen', 'error'); return; }

    const text = await input.files[0].text();
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length < 2) { showToast('Datei ist leer', 'error'); return; }

    // Skip header
    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(';').map(c => c.trim());
      if (cols.length < 1 || !cols[0]) continue;

      const article = {
        id: generateId(),
        name: cols[0] || '',
        ean: cols[1] || '',
        supplier: cols[2] || '',
        purchasePrice: parseFloat((cols[3] || '0').replace(',', '.')) || 0,
        salePrice: parseFloat((cols[4] || '0').replace(',', '.')) || 0,
        stock: parseInt(cols[5]) || 0,
        minStock: parseInt(cols[6]) || 0,
        location: cols[7] || '',
        createdAt: new Date().toISOString(),
      };

      await db.put(STORES.articles, article);
      imported++;
    }

    closeModal();
    showToast(`${imported} Artikel importiert`);
    app.refresh();
  },

  async removeArticle(id) {
    if (!confirm('Artikel wirklich löschen?')) return;
    await db.delete(STORES.articles, id);
    showToast('Artikel gelöscht', 'info');
    app.navigate('inventory');
  }
};
