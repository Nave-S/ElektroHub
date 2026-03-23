// ============================================
// ElektroHub – Foto-Galerie Komponente
// Wiederverwendbar für Kunden und Projekte
// ============================================

const PhotoGallery = {

  // Bild komprimieren (max 1600px breit, JPEG 80%)
  _compressImage(file, maxWidth = 1600, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  // Thumbnail erstellen (200px)
  _createThumbnail(dataUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 200;
        let w = img.width, h = img.height;
        if (w > h) { h = Math.round(h * size / w); w = size; }
        else { w = Math.round(w * size / h); h = size; }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = dataUrl;
    });
  },

  // Galerie-HTML rendern
  async renderGallery(parentType, parentId) {
    const photos = await db.getByIndex(STORES.photos, 'parentId', parentId);
    photos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return `
      <div class="card">
        <div class="card-header">
          <h3>Fotos (${photos.length})</h3>
          <div class="btn-group">
            <button class="btn btn-small btn-secondary" onclick="document.getElementById('photo-camera-${parentId}').click()">📷 Foto aufnehmen</button>
            <button class="btn btn-small btn-primary" onclick="document.getElementById('photo-upload-${parentId}').click()">🖼️ Bild hochladen</button>
          </div>
          <input type="file" id="photo-upload-${parentId}" accept="image/*" multiple style="display:none"
                 onchange="PhotoGallery.upload('${parentType}','${parentId}',this.files)">
          <input type="file" id="photo-camera-${parentId}" accept="image/*" capture="environment" style="display:none"
                 onchange="PhotoGallery.upload('${parentType}','${parentId}',this.files)">
        </div>

        ${photos.length === 0 ? `
          <div class="empty-state" style="padding:30px;">
            <div class="empty-icon">📷</div>
            <p>Noch keine Fotos</p>
            <p class="text-small text-muted">Lade Bilder hoch oder mach ein Foto mit der Kamera</p>
          </div>
        ` : `
          <div class="photo-grid">
            ${photos.map(p => `
              <div class="photo-thumb" onclick="PhotoGallery.viewPhoto('${p.id}')">
                <img src="${p.thumbnail || p.dataUrl}" alt="${escapeHtml(p.title || '')}" loading="lazy">
                ${p.title ? `<div class="photo-thumb-label">${escapeHtml(p.title)}</div>` : ''}
                <div class="photo-thumb-date">${formatDate(p.createdAt)}</div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  },

  // Fotos hochladen (mehrere auf einmal)
  async upload(parentType, parentId, files) {
    if (!files || files.length === 0) return;
    let count = 0;

    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      if (file.size > 20 * 1024 * 1024) {
        showToast(`${file.name} ist zu groß (max 20 MB)`, 'error');
        continue;
      }

      try {
        const dataUrl = await this._compressImage(file);
        const thumbnail = await this._createThumbnail(dataUrl);

        const photo = {
          id: generateId(),
          parentType,
          parentId,
          title: '',
          note: '',
          dataUrl,
          thumbnail,
          originalName: file.name,
          createdAt: new Date().toISOString(),
        };

        await db.put(STORES.photos, photo);
        count++;
      } catch (e) {
        showToast(`Fehler bei ${file.name}: ${e.message}`, 'error');
      }
    }

    if (count > 0) {
      showToast(`${count} Foto${count > 1 ? 's' : ''} gespeichert`);
      app.refresh();
    }
  },

  // Foto in Vollansicht anzeigen
  async viewPhoto(photoId) {
    const photo = await db.get(STORES.photos, photoId);
    if (!photo) return;

    const html = `
      <div style="text-align:center;">
        <img src="${photo.dataUrl}" style="max-width:100%;max-height:60vh;border-radius:8px;" alt="">
      </div>
      <div class="form-group mt-16">
        <label>Titel / Beschreibung</label>
        <input type="text" id="photo-edit-title" value="${escapeHtml(photo.title || '')}" placeholder="z.B. Zählerkasten vorher, Kabelverlegung EG...">
      </div>
      <div class="form-group">
        <label>Notiz</label>
        <textarea id="photo-edit-note" rows="2" placeholder="Optionale Notiz...">${escapeHtml(photo.note || '')}</textarea>
      </div>
      <div class="text-small text-muted mb-16">
        Aufgenommen: ${formatDateTime(photo.createdAt)}${photo.originalName ? ' · ' + escapeHtml(photo.originalName) : ''}
      </div>
      <div class="form-actions" style="justify-content:space-between;">
        <button class="btn btn-danger btn-small" onclick="PhotoGallery.deletePhoto('${photo.id}')">Löschen</button>
        <div class="btn-group">
          <button class="btn btn-secondary" onclick="PhotoGallery.downloadPhoto('${photo.id}')">Herunterladen</button>
          <button class="btn btn-primary" onclick="PhotoGallery.savePhotoMeta('${photo.id}')">Speichern</button>
        </div>
      </div>
    `;

    openModal('Foto', html);
  },

  async savePhotoMeta(photoId) {
    const photo = await db.get(STORES.photos, photoId);
    if (!photo) return;
    photo.title = document.getElementById('photo-edit-title')?.value || '';
    photo.note = document.getElementById('photo-edit-note')?.value || '';
    photo.updatedAt = new Date().toISOString();
    await db.put(STORES.photos, photo);
    closeModal();
    showToast('Foto gespeichert');
    app.refresh();
  },

  async deletePhoto(photoId) {
    if (!confirm('Foto wirklich löschen?')) return;
    await db.delete(STORES.photos, photoId);
    closeModal();
    showToast('Foto gelöscht', 'info');
    app.refresh();
  },

  async downloadPhoto(photoId) {
    const photo = await db.get(STORES.photos, photoId);
    if (!photo) return;
    const a = document.createElement('a');
    a.href = photo.dataUrl;
    a.download = photo.title ? photo.title.replace(/[^a-zA-Z0-9äöüÄÖÜß\-_ ]/g, '') + '.jpg' : 'foto.jpg';
    a.click();
  }
};
