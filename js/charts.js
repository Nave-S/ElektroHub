// ============================================
// ElektroHub – Simple SVG Chart Utilities
// ============================================

const Charts = {
  // Color palette
  colors: ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'],

  // Bar chart (horizontal or vertical)
  bar({ data, width = 600, height = 300, horizontal = false, valuePrefix = '', valueSuffix = '', formatValue = null }) {
    if (!data || data.length === 0) return '<p class="text-muted text-small">Keine Daten vorhanden</p>';
    const maxVal = Math.max(...data.map(d => d.value), 1);
    const margin = { top: 20, right: 20, bottom: 40, left: horizontal ? 160 : 50 };
    const chartW = width - margin.left - margin.right;
    const chartH = height - margin.top - margin.bottom;
    const fmtVal = formatValue || (v => `${valuePrefix}${typeof v === 'number' ? v.toLocaleString('de-DE', { maximumFractionDigits: 2 }) : v}${valueSuffix}`);

    let svg = `<svg viewBox="0 0 ${width} ${height}" width="100%" style="max-width:${width}px;" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<rect width="${width}" height="${height}" fill="transparent"/>`;

    if (horizontal) {
      const barH = Math.min(28, (chartH / data.length) - 4);
      const gap = (chartH - barH * data.length) / (data.length + 1);
      data.forEach((d, i) => {
        const y = margin.top + gap + i * (barH + gap);
        const barW = (d.value / maxVal) * chartW;
        const color = d.color || this.colors[i % this.colors.length];
        // Label
        svg += `<text x="${margin.left - 8}" y="${y + barH / 2 + 4}" text-anchor="end" font-size="11" fill="#374151">${this._truncate(d.label, 22)}</text>`;
        // Bar
        svg += `<rect x="${margin.left}" y="${y}" width="${Math.max(barW, 2)}" height="${barH}" rx="3" fill="${color}" opacity="0.85"/>`;
        // Value
        svg += `<text x="${margin.left + barW + 6}" y="${y + barH / 2 + 4}" font-size="11" font-weight="600" fill="#374151">${fmtVal(d.value)}</text>`;
      });
    } else {
      const barW = Math.min(40, (chartW / data.length) - 8);
      const gap = (chartW - barW * data.length) / (data.length + 1);
      // Y-axis lines
      for (let i = 0; i <= 4; i++) {
        const y = margin.top + (chartH / 4) * i;
        const val = maxVal - (maxVal / 4) * i;
        svg += `<line x1="${margin.left}" y1="${y}" x2="${margin.left + chartW}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>`;
        svg += `<text x="${margin.left - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="#9ca3af">${fmtVal(val)}</text>`;
      }
      data.forEach((d, i) => {
        const x = margin.left + gap + i * (barW + gap);
        const barH = (d.value / maxVal) * chartH;
        const y = margin.top + chartH - barH;
        const color = d.color || this.colors[i % this.colors.length];
        svg += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="3" fill="${color}" opacity="0.85"/>`;
        // Label (rotated if many items)
        if (data.length <= 12) {
          svg += `<text x="${x + barW / 2}" y="${margin.top + chartH + 16}" text-anchor="middle" font-size="10" fill="#6b7280">${this._truncate(d.label, 10)}</text>`;
        } else {
          svg += `<text x="${x + barW / 2}" y="${margin.top + chartH + 14}" text-anchor="end" font-size="9" fill="#6b7280" transform="rotate(-45 ${x + barW / 2} ${margin.top + chartH + 14})">${this._truncate(d.label, 8)}</text>`;
        }
      });
    }

    svg += '</svg>';
    return svg;
  },

  // Pie / Donut chart
  pie({ data, width = 280, height = 280, donut = true, showLegend = true }) {
    if (!data || data.length === 0) return '<p class="text-muted text-small">Keine Daten vorhanden</p>';
    const total = data.reduce((s, d) => s + d.value, 0);
    if (total === 0) return '<p class="text-muted text-small">Keine Daten vorhanden</p>';

    const cx = width / 2, cy = height / 2;
    const r = Math.min(cx, cy) - 10;
    const innerR = donut ? r * 0.55 : 0;

    let svg = `<svg viewBox="0 0 ${width} ${height}" width="100%" style="max-width:${width}px;" xmlns="http://www.w3.org/2000/svg">`;

    let startAngle = -Math.PI / 2;
    data.forEach((d, i) => {
      const pct = d.value / total;
      const angle = pct * 2 * Math.PI;
      const endAngle = startAngle + angle;
      const largeArc = angle > Math.PI ? 1 : 0;
      const color = d.color || this.colors[i % this.colors.length];

      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);

      if (donut) {
        const ix1 = cx + innerR * Math.cos(startAngle);
        const iy1 = cy + innerR * Math.sin(startAngle);
        const ix2 = cx + innerR * Math.cos(endAngle);
        const iy2 = cy + innerR * Math.sin(endAngle);
        svg += `<path d="M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1} Z" fill="${color}" opacity="0.85"/>`;
      } else {
        svg += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${color}" opacity="0.85"/>`;
      }
      startAngle = endAngle;
    });

    // Center text for donut
    if (donut) {
      svg += `<text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="18" font-weight="700" fill="#1f2937">${total.toLocaleString('de-DE', { maximumFractionDigits: 0 })}</text>`;
      svg += `<text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="10" fill="#9ca3af">Gesamt</text>`;
    }

    svg += '</svg>';

    // Legend
    let legendHtml = '';
    if (showLegend) {
      legendHtml = '<div class="chart-legend">';
      data.forEach((d, i) => {
        const color = d.color || this.colors[i % this.colors.length];
        const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0.0';
        legendHtml += `<div class="chart-legend-item"><span class="chart-legend-dot" style="background:${color}"></span>${escapeHtml(d.label)}: ${pct}%</div>`;
      });
      legendHtml += '</div>';
    }

    return `<div class="chart-container">${svg}${legendHtml}</div>`;
  },

  // Stacked monthly bar chart (for yearly overview)
  monthlyBars({ months, width = 700, height = 300, valueSuffix = ' €' }) {
    if (!months || months.length === 0) return '';
    const maxVal = Math.max(...months.map(m => m.value), 1);
    const margin = { top: 20, right: 20, bottom: 35, left: 60 };
    const chartW = width - margin.left - margin.right;
    const chartH = height - margin.top - margin.bottom;
    const barW = Math.min(40, (chartW / months.length) - 6);
    const gap = (chartW - barW * months.length) / (months.length + 1);

    let svg = `<svg viewBox="0 0 ${width} ${height}" width="100%" style="max-width:${width}px;" xmlns="http://www.w3.org/2000/svg">`;

    // Grid lines
    for (let i = 0; i <= 4; i++) {
      const y = margin.top + (chartH / 4) * i;
      const val = maxVal - (maxVal / 4) * i;
      svg += `<line x1="${margin.left}" y1="${y}" x2="${margin.left + chartW}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>`;
      svg += `<text x="${margin.left - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="#9ca3af">${this._formatCompact(val)}${valueSuffix}</text>`;
    }

    months.forEach((m, i) => {
      const x = margin.left + gap + i * (barW + gap);
      const barH = (m.value / maxVal) * chartH;
      const y = margin.top + chartH - barH;
      const color = m.value > 0 ? '#2563eb' : '#e5e7eb';
      svg += `<rect x="${x}" y="${y}" width="${barW}" height="${Math.max(barH, 1)}" rx="2" fill="${color}" opacity="0.8"/>`;
      svg += `<text x="${x + barW / 2}" y="${margin.top + chartH + 16}" text-anchor="middle" font-size="10" fill="#6b7280">${m.label}</text>`;
    });

    svg += '</svg>';
    return svg;
  },

  _truncate(str, max) {
    return str.length > max ? str.substring(0, max - 1) + '…' : str;
  },

  _formatCompact(val) {
    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
    if (val >= 1000) return (val / 1000).toFixed(1) + 'k';
    return val.toFixed(0);
  }
};
