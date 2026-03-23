// ============================================
// ElektroHub – Kunden View
// ============================================

const CustomersView = {
  async render(detailId) {
    if (detailId) return this.renderDetail(detailId);
    return this.renderList();
  },

  async renderList() {
    const customers = await db.getAll(STORES.customers);
    const projects = await db.getAll(STORES.projects);

    return `
      <div class="page-header">
        <div>
          <h2>Kunden</h2>
          <p class="page-subtitle">${customers.length} Kunden</p>
        </div>
        <div class="btn-group">
          <button class="btn btn-secondary" onclick="OCRImport.show('customer')">📷 Aus Foto</button>
          <button class="btn btn-primary" onclick="CustomersView.showForm()">+ Neuer Kunde</button>
        </div>
      </div>

      <div class="toolbar">
        <input type="text" class="search-input" placeholder="Kunden suchen..." id="customer-search"
               oninput="CustomersView.filter()">
        <select class="filter-select" id="customer-type-filter" onchange="CustomersView.filter()">
          <option value="">Alle Typen</option>
          ${selectOptions(CUSTOMER_TYPES, '')}
        </select>
      </div>

      <div class="card">
        ${customers.length === 0 ?
          `<div class="empty-state">
            <div class="empty-icon">👥</div>
            <p>Noch keine Kunden angelegt</p>
            <button class="btn btn-primary" onclick="CustomersView.showForm()">Ersten Kunden anlegen</button>
          </div>` :
          `<div class="table-wrapper">
            <table id="customers-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Typ</th>
                  <th>Kontakt</th>
                  <th>Projekte</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${customers.sort((a,b) => a.name.localeCompare(b.name)).map(c => {
                  const pCount = projects.filter(p => p.customerId === c.id).length;
                  const typeLabel = CUSTOMER_TYPES.find(t => t.value === c.type)?.label || c.type;
                  const displayName = getCustomerDisplayName(c);
                  return `
                    <tr class="clickable customer-row" data-name="${escapeHtml((displayName || c.name).toLowerCase())}" data-type="${c.type}"
                        onclick="app.navigate('customers', '${c.id}')">
                      <td><code>${escapeHtml(c.customerId)}</code></td>
                      <td><strong>${escapeHtml(displayName || c.name)}</strong></td>
                      <td><span class="badge badge-gray">${escapeHtml(typeLabel)}</span></td>
                      <td>
                        ${c.phone ? `<span class="text-small">${escapeHtml(c.phone)}</span><br>` : ''}
                        ${c.email ? `<span class="text-small text-muted">${escapeHtml(c.email)}</span>` : ''}
                      </td>
                      <td>${pCount}</td>
                      <td>
                        <button class="btn-icon" onclick="event.stopPropagation(); CustomersView.showForm('${c.id}')" title="Bearbeiten">✏️</button>
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
    const customer = await db.get(STORES.customers, id);
    if (!customer) return '<p>Kunde nicht gefunden.</p>';
    const projects = await db.getByIndex(STORES.projects, 'customerId', id);
    const invoices = await db.getAll(STORES.invoices);
    const customerInvoices = invoices.filter(i => projects.some(p => p.id === i.projectId));
    const totalRevenue = customerInvoices.filter(i => i.type === 'rechnung' && i.status === 'bezahlt')
                                         .reduce((s,i) => s + (i.totalGross||0), 0);
    const typeLabel = CUSTOMER_TYPES.find(t => t.value === customer.type)?.label || customer.type;
    const displayName = getCustomerDisplayName(customer);
    const formattedAddr = getFormattedAddress(customer);

    return `
      <div class="breadcrumb">
        <a href="#" onclick="app.navigate('customers');return false;">Kunden</a>
        <span class="breadcrumb-sep">›</span>
        <strong>${escapeHtml(displayName || customer.name)}</strong>
      </div>
      <div class="detail-header">
        <div>
          <div class="detail-title">${escapeHtml(displayName || customer.name)}</div>
          <div class="detail-id">${escapeHtml(customer.customerId)}</div>
        </div>
        <div class="btn-group">
          <button class="btn btn-secondary" onclick="CustomersView.showForm('${customer.id}')">✏️ Bearbeiten</button>
          <button class="btn btn-danger" onclick="CustomersView.remove('${customer.id}')">Löschen</button>
        </div>
      </div>

      <div class="detail-meta">
        <div class="detail-meta-item">
          <div class="meta-label">Typ</div>
          <div class="meta-value">${escapeHtml(typeLabel)}</div>
        </div>
        ${customer.anrede ? `
        <div class="detail-meta-item">
          <div class="meta-label">Anrede</div>
          <div class="meta-value">${escapeHtml([customer.anrede, customer.title].filter(Boolean).join(' '))}</div>
        </div>` : ''}
        <div class="detail-meta-item">
          <div class="meta-label">Telefon</div>
          <div class="meta-value">${customer.phone ? `<a href="tel:${escapeHtml(customer.phone)}">${escapeHtml(customer.phone)}</a>` : '–'}</div>
        </div>
        ${customer.mobile ? `
        <div class="detail-meta-item">
          <div class="meta-label">Mobil</div>
          <div class="meta-value"><a href="tel:${escapeHtml(customer.mobile)}">${escapeHtml(customer.mobile)}</a></div>
        </div>` : ''}
        <div class="detail-meta-item">
          <div class="meta-label">E-Mail</div>
          <div class="meta-value">${customer.email ? `<a href="mailto:${escapeHtml(customer.email)}">${escapeHtml(customer.email)}</a>` : '–'}</div>
        </div>
        ${customer.ustId ? `
        <div class="detail-meta-item">
          <div class="meta-label">USt-ID</div>
          <div class="meta-value">${escapeHtml(customer.ustId)}</div>
        </div>` : ''}
        ${customer.contact ? `
        <div class="detail-meta-item">
          <div class="meta-label">Ansprechpartner</div>
          <div class="meta-value">${escapeHtml(customer.contact)}</div>
        </div>` : ''}
        <div class="detail-meta-item">
          <div class="meta-label">Umsatz (bezahlt)</div>
          <div class="meta-value">${formatCurrency(totalRevenue)}</div>
        </div>
      </div>

      ${formattedAddr ? `
        <div class="card">
          <h3 class="mb-8">Adresse</h3>
          <p>${escapeHtml(formattedAddr).replace(/\n/g, '<br>')}</p>
          ${customer.country && customer.country !== 'Deutschland' ? `<p class="text-muted text-small">${escapeHtml(customer.country)}</p>` : ''}
        </div>
      ` : ''}

      ${customer.notes ? `
        <div class="card">
          <h3 class="mb-8">Notizen</h3>
          <p>${escapeHtml(customer.notes).replace(/\n/g, '<br>')}</p>
        </div>
      ` : ''}

      <div class="card">
        <div class="card-header">
          <h3>Projekte (${projects.length})</h3>
          <button class="btn btn-small btn-primary" onclick="ProjectsView.showForm(null, '${customer.id}')">+ Neues Projekt</button>
        </div>
        ${projects.length === 0 ? '<p class="text-muted text-small">Keine Projekte</p>' :
          `<table>
            <thead><tr><th>ID</th><th>Projekt</th><th>Status</th><th>Erstellt</th></tr></thead>
            <tbody>
              ${projects.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).map(p => `
                <tr class="clickable" onclick="app.navigate('projects', '${p.id}')">
                  <td><code>${escapeHtml(p.projectId)}</code></td>
                  <td><strong>${escapeHtml(p.title)}</strong></td>
                  <td>${statusBadge(p.status, PROJECT_STATUSES)}</td>
                  <td>${formatDate(p.createdAt)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>`
        }
      </div>

      <!-- Fotos -->
      ${await PhotoGallery.renderGallery('customer', id)}
    `;
  },

  filter() {
    const search = document.getElementById('customer-search').value.toLowerCase();
    const typeFilter = document.getElementById('customer-type-filter').value;
    document.querySelectorAll('.customer-row').forEach(row => {
      const name = row.dataset.name;
      const type = row.dataset.type;
      const matchSearch = !search || name.includes(search);
      const matchType = !typeFilter || type === typeFilter;
      row.style.display = (matchSearch && matchType) ? '' : 'none';
    });
  },

  async showForm(editId, prefillCustomerId) {
    let customer = editId ? await db.get(STORES.customers, editId) : null;
    const isEdit = !!customer;

    const html = `
      <form id="customer-form">
        <div class="form-row">
          <div class="form-group" style="flex:0 0 140px">
            <label>Anrede</label>
            <select name="anrede">
              <option value="">– Bitte wählen –</option>
              ${selectOptions(CUSTOMER_ANREDEN, customer?.anrede || '')}
            </select>
          </div>
          <div class="form-group" style="flex:0 0 100px">
            <label>Titel</label>
            <input type="text" name="title" placeholder="Dr., Prof." value="${escapeHtml(customer?.title || '')}">
          </div>
          <div class="form-group">
            <label>Vorname</label>
            <input type="text" name="firstName" value="${escapeHtml(customer?.firstName || '')}">
          </div>
          <div class="form-group">
            <label>Nachname / Firmenname *</label>
            <input type="text" name="name" required value="${escapeHtml(customer?.name || '')}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Typ</label>
            <select name="type">
              ${selectOptions(CUSTOMER_TYPES, customer?.type || 'privat')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Straße</label>
            <input type="text" name="street" value="${escapeHtml(customer?.street || '')}">
          </div>
          <div class="form-group" style="flex:0 0 120px">
            <label>Hausnummer</label>
            <input type="text" name="houseNumber" value="${escapeHtml(customer?.houseNumber || '')}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group" style="flex:0 0 120px">
            <label>PLZ</label>
            <input type="text" name="zip" value="${escapeHtml(customer?.zip || '')}">
          </div>
          <div class="form-group">
            <label>Ort</label>
            <input type="text" name="city" value="${escapeHtml(customer?.city || '')}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Land</label>
            <input type="text" name="country" value="${escapeHtml(customer?.country || 'Deutschland')}">
          </div>
          <div class="form-group">
            <label>Adresszusatz</label>
            <input type="text" name="addressExtra" placeholder="z.B. Hinterhaus, 3. OG" value="${escapeHtml(customer?.addressExtra || '')}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Telefon</label>
            <input type="tel" name="phone" value="${escapeHtml(customer?.phone || '')}">
          </div>
          <div class="form-group">
            <label>Mobil</label>
            <input type="tel" name="mobile" value="${escapeHtml(customer?.mobile || '')}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>E-Mail</label>
            <input type="email" name="email" value="${escapeHtml(customer?.email || '')}">
          </div>
          <div class="form-group">
            <label>USt-ID</label>
            <input type="text" name="ustId" placeholder="DE123456789" value="${escapeHtml(customer?.ustId || '')}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Ansprechpartner</label>
            <input type="text" name="contact" value="${escapeHtml(customer?.contact || '')}">
          </div>
          <div class="form-group">
            <label>Notizen</label>
            <textarea name="notes" rows="3">${escapeHtml(customer?.notes || '')}</textarea>
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Speichern' : 'Anlegen'}</button>
        </div>
      </form>
    `;

    openModal(isEdit ? 'Kunde bearbeiten' : 'Neuer Kunde', html);

    document.getElementById('customer-form').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);

      if (!isEdit) {
        const allCustomers = await db.getAll(STORES.customers);
        const seq = allCustomers.length + 1;
        customer = {
          id: generateId(),
          customerId: generateCustomerId(seq),
          createdAt: new Date().toISOString(),
        };
      }

      customer.anrede = fd.get('anrede');
      customer.title = fd.get('title');
      customer.firstName = fd.get('firstName');
      customer.name = fd.get('name');
      customer.type = fd.get('type');
      customer.street = fd.get('street');
      customer.houseNumber = fd.get('houseNumber');
      customer.zip = fd.get('zip');
      customer.city = fd.get('city');
      customer.country = fd.get('country');
      customer.addressExtra = fd.get('addressExtra');
      customer.phone = fd.get('phone');
      customer.mobile = fd.get('mobile');
      customer.email = fd.get('email');
      customer.ustId = fd.get('ustId');
      customer.contact = fd.get('contact');
      customer.notes = fd.get('notes');
      // Backward compatibility: keep computed address field in sync
      customer.address = getFormattedAddress(customer);
      customer.updatedAt = new Date().toISOString();

      await db.put(STORES.customers, customer);
      closeModal();
      showToast(isEdit ? 'Kunde gespeichert' : 'Kunde angelegt');
      app.refresh();
    };
  },

  async remove(id) {
    if (!confirm('Kunde wirklich löschen? Zugehörige Projekte bleiben erhalten.')) return;
    await db.delete(STORES.customers, id);
    showToast('Kunde gelöscht', 'info');
    app.navigate('customers');
  }
};
