// ============================================
// ElektroHub – Digitale Unterschrift (Signature Pad)
// Touch- und Maus-Eingabe auf Canvas
// ============================================

const SignaturePad = {
  _canvas: null,
  _ctx: null,
  _drawing: false,
  _lastX: 0,
  _lastY: 0,
  _callback: null,
  _hasStrokes: false,

  /**
   * Öffnet ein Modal mit einem Zeichenfeld für die Unterschrift.
   * @param {function} callback - Wird mit der data-URL (base64 PNG) aufgerufen
   */
  capture(callback) {
    this._callback = callback;
    this._hasStrokes = false;

    const html = `
      <div style="text-align:center;">
        <div style="
          display:inline-block;
          border:2px solid var(--gray-600);
          border-radius:8px;
          overflow:hidden;
          background:#fff;
          touch-action:none;
          cursor:crosshair;
        ">
          <canvas id="signature-canvas" width="500" height="200"
            style="display:block;max-width:100%;"></canvas>
        </div>
        <p class="text-muted" style="margin-top:8px;font-size:0.8rem;">
          Mit Maus oder Finger unterschreiben
        </p>
        <div style="margin-top:16px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
          <button class="btn-secondary" onclick="SignaturePad._clear()">Löschen</button>
          <button class="btn-secondary" onclick="SignaturePad._cancel()">Abbrechen</button>
          <button class="btn-primary" onclick="SignaturePad._save()">Übernehmen</button>
        </div>
      </div>
    `;

    openModal('Unterschrift', html);

    // Canvas initialisieren (nach DOM-Rendering)
    requestAnimationFrame(() => this._initCanvas());
  },

  /**
   * Initialisiert den Canvas und bindet Events.
   */
  _initCanvas() {
    this._canvas = document.getElementById('signature-canvas');
    if (!this._canvas) return;

    this._ctx = this._canvas.getContext('2d');

    // Weißer Hintergrund
    this._ctx.fillStyle = '#ffffff';
    this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);

    // Zeichenstil
    this._ctx.strokeStyle = '#000000';
    this._ctx.lineWidth = 2.5;
    this._ctx.lineCap = 'round';
    this._ctx.lineJoin = 'round';

    // Event-Handler (gebunden für späteres Entfernen)
    this._onMouseDown = this._handleStart.bind(this);
    this._onMouseMove = this._handleMove.bind(this);
    this._onMouseUp = this._handleEnd.bind(this);
    this._onTouchStart = this._handleTouchStart.bind(this);
    this._onTouchMove = this._handleTouchMove.bind(this);
    this._onTouchEnd = this._handleEnd.bind(this);

    // Maus-Events
    this._canvas.addEventListener('mousedown', this._onMouseDown);
    this._canvas.addEventListener('mousemove', this._onMouseMove);
    this._canvas.addEventListener('mouseup', this._onMouseUp);
    this._canvas.addEventListener('mouseleave', this._onMouseUp);

    // Touch-Events
    this._canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
    this._canvas.addEventListener('touchmove', this._onTouchMove, { passive: false });
    this._canvas.addEventListener('touchend', this._onTouchEnd);
    this._canvas.addEventListener('touchcancel', this._onTouchEnd);
  },

  /**
   * Berechnet Canvas-Koordinaten aus einem Event (berücksichtigt Skalierung).
   */
  _getPos(e) {
    const rect = this._canvas.getBoundingClientRect();
    const scaleX = this._canvas.width / rect.width;
    const scaleY = this._canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  },

  // --- Mouse Events ---

  _handleStart(e) {
    this._drawing = true;
    const pos = this._getPos(e);
    this._lastX = pos.x;
    this._lastY = pos.y;
    this._ctx.beginPath();
    this._ctx.moveTo(pos.x, pos.y);
  },

  _handleMove(e) {
    if (!this._drawing) return;
    const pos = this._getPos(e);
    this._ctx.lineTo(pos.x, pos.y);
    this._ctx.stroke();
    this._ctx.beginPath();
    this._ctx.moveTo(pos.x, pos.y);
    this._lastX = pos.x;
    this._lastY = pos.y;
    this._hasStrokes = true;
  },

  _handleEnd() {
    if (!this._drawing) return;
    this._drawing = false;
    this._ctx.beginPath();
  },

  // --- Touch Events ---

  _handleTouchStart(e) {
    e.preventDefault();
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    this._handleStart({
      clientX: touch.clientX,
      clientY: touch.clientY,
    });
  },

  _handleTouchMove(e) {
    e.preventDefault();
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    this._handleMove({
      clientX: touch.clientX,
      clientY: touch.clientY,
    });
  },

  // --- Aktionen ---

  /**
   * Canvas löschen.
   */
  _clear() {
    if (!this._ctx) return;
    this._ctx.fillStyle = '#ffffff';
    this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);
    // Zeichenstil wiederherstellen
    this._ctx.strokeStyle = '#000000';
    this._ctx.lineWidth = 2.5;
    this._ctx.lineCap = 'round';
    this._ctx.lineJoin = 'round';
    this._hasStrokes = false;
  },

  /**
   * Abbrechen – Modal schließen, kein Callback.
   */
  _cancel() {
    this._cleanup();
    closeModal();
  },

  /**
   * Übernehmen – Canvas als Base64 Data-URL an Callback übergeben.
   */
  _save() {
    if (!this._hasStrokes) {
      showToast('Bitte zuerst unterschreiben.', 'error');
      return;
    }

    if (!this._canvas || !this._callback) return;

    const dataUrl = this._canvas.toDataURL('image/png');
    const cb = this._callback;
    this._cleanup();
    closeModal();

    // Callback mit data-URL aufrufen
    cb(dataUrl);
  },

  /**
   * Event-Listener entfernen und Zustand zurücksetzen.
   */
  _cleanup() {
    if (this._canvas) {
      this._canvas.removeEventListener('mousedown', this._onMouseDown);
      this._canvas.removeEventListener('mousemove', this._onMouseMove);
      this._canvas.removeEventListener('mouseup', this._onMouseUp);
      this._canvas.removeEventListener('mouseleave', this._onMouseUp);
      this._canvas.removeEventListener('touchstart', this._onTouchStart);
      this._canvas.removeEventListener('touchmove', this._onTouchMove);
      this._canvas.removeEventListener('touchend', this._onTouchEnd);
      this._canvas.removeEventListener('touchcancel', this._onTouchEnd);
    }
    this._canvas = null;
    this._ctx = null;
    this._callback = null;
    this._drawing = false;
    this._hasStrokes = false;
  }
};
