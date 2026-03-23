// ============================================
// Minimal QR Code Generator (Byte mode, EC level M)
// Generates EPC/GiroCode QR codes for SEPA payments
// Output: SVG string or Data URL
// ============================================

const QRCode = (() => {
  // GF(256) with primitive polynomial 0x11d
  const GF_EXP = new Uint8Array(512);
  const GF_LOG = new Uint8Array(256);
  (() => {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      GF_EXP[i] = x;
      GF_LOG[x] = i;
      x = x << 1;
      if (x & 256) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return GF_EXP[GF_LOG[a] + GF_LOG[b]];
  }

  function polyMul(p, q) {
    const r = new Uint8Array(p.length + q.length - 1);
    for (let i = 0; i < p.length; i++)
      for (let j = 0; j < q.length; j++)
        r[i + j] ^= gfMul(p[i], q[j]);
    return r;
  }

  function polyRest(dividend, divisor) {
    const result = new Uint8Array(dividend);
    for (let i = 0; i < dividend.length - divisor.length + 1; i++) {
      if (result[i] === 0) continue;
      const coef = result[i];
      for (let j = 0; j < divisor.length; j++)
        result[i + j] ^= gfMul(divisor[j], coef);
    }
    return result.slice(dividend.length - divisor.length + 1);
  }

  function generatorPoly(n) {
    let g = new Uint8Array([1]);
    for (let i = 0; i < n; i++)
      g = polyMul(g, new Uint8Array([1, GF_EXP[i]]));
    return g;
  }

  // QR Version info: [totalCodewords, ecCodewordsPerBlock, numBlocksGroup1, dataPerBlock1, numBlocksGroup2, dataPerBlock2]
  // EC Level M
  const VERSION_INFO = [
    null, // 0
    [26, 10, 1, 16, 0, 0],       // v1
    [44, 16, 1, 28, 0, 0],       // v2
    [70, 26, 1, 44, 0, 0],       // v3
    [100, 18, 2, 32, 0, 0],      // v4
    [134, 24, 2, 43, 0, 0],      // v5
    [172, 16, 4, 27, 0, 0],      // v6
    [196, 18, 4, 31, 0, 0],      // v7
    [242, 22, 2, 38, 2, 39],     // v8
    [292, 22, 3, 36, 2, 37],     // v9
    [346, 26, 4, 43, 1, 44],     // v10
    [404, 30, 1, 50, 4, 51],     // v11
    [466, 22, 6, 36, 2, 37],     // v12
    [532, 22, 8, 37, 1, 38],     // v13
  ];

  const ALIGNMENT_POSITIONS = [
    null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
    [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
    [6, 30, 54], [6, 32, 58], [6, 34, 62],
  ];

  function getVersion(dataLen) {
    for (let v = 1; v <= 13; v++) {
      const info = VERSION_INFO[v];
      const totalData = info[2] * info[3] + info[4] * info[5];
      // Byte mode: 4 bits mode + char count bits + data
      const charCountBits = v <= 9 ? 8 : 16;
      const availBits = totalData * 8;
      const needed = 4 + charCountBits + dataLen * 8;
      if (needed <= availBits) return v;
    }
    return -1;
  }

  function encodeData(data, version) {
    const info = VERSION_INFO[version];
    const totalData = info[2] * info[3] + info[4] * info[5];
    const charCountBits = version <= 9 ? 8 : 16;

    // Build bit stream
    let bits = '';
    // Mode: 0100 (byte)
    bits += '0100';
    // Character count
    bits += data.length.toString(2).padStart(charCountBits, '0');
    // Data
    for (const byte of data)
      bits += byte.toString(2).padStart(8, '0');
    // Terminator
    const capacity = totalData * 8;
    bits += '0000'.slice(0, Math.min(4, capacity - bits.length));
    // Pad to byte boundary
    while (bits.length % 8 !== 0) bits += '0';
    // Pad bytes
    let padToggle = false;
    while (bits.length < capacity) {
      bits += padToggle ? '00010001' : '11101100';
      padToggle = !padToggle;
    }

    // Convert to bytes
    const bytes = new Uint8Array(totalData);
    for (let i = 0; i < totalData; i++)
      bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);

    return bytes;
  }

  function addErrorCorrection(dataBytes, version) {
    const info = VERSION_INFO[version];
    const [totalCW, ecPerBlock, g1Blocks, g1Data, g2Blocks, g2Data] = info;
    const gen = generatorPoly(ecPerBlock);
    const blocks = [];
    const ecBlocks = [];
    let offset = 0;

    for (let g = 0; g < 2; g++) {
      const numBlocks = g === 0 ? g1Blocks : g2Blocks;
      const dataPerBlock = g === 0 ? g1Data : g2Data;
      for (let b = 0; b < numBlocks; b++) {
        const block = dataBytes.slice(offset, offset + dataPerBlock);
        offset += dataPerBlock;
        blocks.push(block);
        // Calculate EC
        const padded = new Uint8Array(dataPerBlock + ecPerBlock);
        padded.set(block);
        const ec = polyRest(padded, gen);
        ecBlocks.push(ec);
      }
    }

    // Interleave
    const result = [];
    const maxDataLen = Math.max(g1Data, g2Data);
    for (let i = 0; i < maxDataLen; i++)
      for (const block of blocks)
        if (i < block.length) result.push(block[i]);
    for (let i = 0; i < ecPerBlock; i++)
      for (const ec of ecBlocks)
        if (i < ec.length) result.push(ec[i]);

    return new Uint8Array(result);
  }

  function createMatrix(version) {
    const size = version * 4 + 17;
    const matrix = Array.from({ length: size }, () => new Int8Array(size)); // 0=empty, 1=black, -1=white
    const reserved = Array.from({ length: size }, () => new Uint8Array(size)); // 1=reserved

    function setModule(r, c, val) {
      if (r >= 0 && r < size && c >= 0 && c < size) {
        matrix[r][c] = val ? 1 : -1;
        reserved[r][c] = 1;
      }
    }

    // Finder patterns
    function finderPattern(row, col) {
      for (let r = -1; r <= 7; r++)
        for (let c = -1; c <= 7; c++) {
          const val = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                     (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
                     (r >= 2 && r <= 4 && c >= 2 && c <= 4);
          setModule(row + r, col + c, val && r >= 0 && r <= 6 && c >= 0 && c <= 6);
          if (!(val && r >= 0 && r <= 6 && c >= 0 && c <= 6)) setModule(row + r, col + c, false);
        }
    }
    finderPattern(0, 0);
    finderPattern(0, size - 7);
    finderPattern(size - 7, 0);

    // Timing patterns
    for (let i = 8; i < size - 8; i++) {
      setModule(6, i, i % 2 === 0);
      setModule(i, 6, i % 2 === 0);
    }

    // Alignment patterns
    if (version >= 2) {
      const positions = ALIGNMENT_POSITIONS[version];
      for (const r of positions) {
        for (const c of positions) {
          if (reserved[r][c]) continue;
          for (let dr = -2; dr <= 2; dr++)
            for (let dc = -2; dc <= 2; dc++)
              setModule(r + dr, c + dc,
                Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0));
        }
      }
    }

    // Dark module
    setModule(size - 8, 8, true);

    // Reserve format info areas
    for (let i = 0; i < 8; i++) {
      if (!reserved[8][i]) { reserved[8][i] = 1; matrix[8][i] = 0; }
      if (!reserved[8][size - 1 - i]) { reserved[8][size - 1 - i] = 1; matrix[8][size - 1 - i] = 0; }
      if (!reserved[i][8]) { reserved[i][8] = 1; matrix[i][8] = 0; }
      if (!reserved[size - 1 - i][8]) { reserved[size - 1 - i][8] = 1; matrix[size - 1 - i][8] = 0; }
    }
    if (!reserved[8][8]) { reserved[8][8] = 1; matrix[8][8] = 0; }

    // Reserve version info (v >= 7 only, we don't need it for v1-13 but v7+ needs it)
    if (version >= 7) {
      for (let i = 0; i < 6; i++)
        for (let j = 0; j < 3; j++) {
          reserved[i][size - 11 + j] = 1;
          reserved[size - 11 + j][i] = 1;
        }
    }

    return { matrix, reserved, size };
  }

  function placeData(matrix, reserved, size, data) {
    let bitIndex = 0;
    let upward = true;

    for (let col = size - 1; col >= 0; col -= 2) {
      if (col === 6) col--;
      const rows = upward ? Array.from({ length: size }, (_, i) => size - 1 - i) : Array.from({ length: size }, (_, i) => i);
      for (const row of rows) {
        for (let c = 0; c < 2; c++) {
          const actualCol = col - c;
          if (actualCol < 0 || reserved[row][actualCol]) continue;
          const bit = bitIndex < data.length * 8 ?
            (data[Math.floor(bitIndex / 8)] >> (7 - (bitIndex % 8))) & 1 : 0;
          matrix[row][actualCol] = bit ? 1 : -1;
          bitIndex++;
        }
      }
      upward = !upward;
    }
  }

  const MASK_FUNCTIONS = [
    (r, c) => (r + c) % 2 === 0,
    (r, c) => r % 2 === 0,
    (r, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => ((r * c) % 2 + (r * c) % 3) === 0,
    (r, c) => ((r * c) % 2 + (r * c) % 3) % 2 === 0,
    (r, c) => ((r + c) % 2 + (r * c) % 3) % 2 === 0,
  ];

  function applyMask(matrix, reserved, size, maskIndex) {
    const masked = matrix.map(row => new Int8Array(row));
    const fn = MASK_FUNCTIONS[maskIndex];
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        if (!reserved[r][c] && fn(r, c))
          masked[r][c] = masked[r][c] === 1 ? -1 : 1;
    return masked;
  }

  // Format info for EC level M (01) with mask patterns 0-7
  const FORMAT_BITS = [
    0x5412, 0x5125, 0x5E7C, 0x5B4B, 0x45F9, 0x40CE, 0x4F97, 0x4AA0
  ];

  function placeFormatInfo(matrix, size, maskIndex) {
    const bits = FORMAT_BITS[maskIndex];
    const positions1 = [[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],[7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8]];
    const positions2 = [];
    for (let i = 0; i < 7; i++) positions2.push([size - 1 - i, 8]);
    for (let i = 0; i < 8; i++) positions2.push([8, size - 8 + i]);

    for (let i = 0; i < 15; i++) {
      const val = (bits >> (14 - i)) & 1;
      const [r1, c1] = positions1[i];
      matrix[r1][c1] = val ? 1 : -1;
      if (i < positions2.length) {
        const [r2, c2] = positions2[i];
        matrix[r2][c2] = val ? 1 : -1;
      }
    }
  }

  // Version info for v7+
  const VERSION_BITS = [null,null,null,null,null,null,null,
    0x07C94,0x085BC,0x09A99,0x0A4D3,0x0BBF6,0x0C762,0x0D847];

  function placeVersionInfo(matrix, size, version) {
    if (version < 7) return;
    const bits = VERSION_BITS[version];
    for (let i = 0; i < 18; i++) {
      const val = (bits >> i) & 1;
      const r = Math.floor(i / 3);
      const c = size - 11 + (i % 3);
      matrix[r][c] = val ? 1 : -1;
      matrix[c][r] = val ? 1 : -1;
    }
  }

  function scoreMask(matrix, size) {
    let score = 0;
    // Rule 1: consecutive same-color modules
    for (let r = 0; r < size; r++) {
      let count = 1;
      for (let c = 1; c < size; c++) {
        if (matrix[r][c] === matrix[r][c-1]) {
          count++;
          if (count === 5) score += 3;
          else if (count > 5) score++;
        } else count = 1;
      }
    }
    for (let c = 0; c < size; c++) {
      let count = 1;
      for (let r = 1; r < size; r++) {
        if (matrix[r][c] === matrix[r-1][c]) {
          count++;
          if (count === 5) score += 3;
          else if (count > 5) score++;
        } else count = 1;
      }
    }
    // Rule 2: 2x2 blocks
    for (let r = 0; r < size - 1; r++)
      for (let c = 0; c < size - 1; c++)
        if (matrix[r][c] === matrix[r][c+1] && matrix[r][c] === matrix[r+1][c] && matrix[r][c] === matrix[r+1][c+1])
          score += 3;
    return score;
  }

  function generate(text) {
    // Encode text as UTF-8 bytes
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const version = getVersion(data.length);
    if (version < 0) return null;

    const dataBytes = encodeData(data, version);
    const codewords = addErrorCorrection(dataBytes, version);
    const { matrix, reserved, size } = createMatrix(version);
    placeData(matrix, reserved, size, codewords);

    // Try all masks, pick best
    let bestScore = Infinity;
    let bestMask = 0;
    let bestMatrix = null;
    for (let m = 0; m < 8; m++) {
      const masked = applyMask(matrix, reserved, size, m);
      placeFormatInfo(masked, size, m);
      placeVersionInfo(masked, size, version);
      const score = scoreMask(masked, size);
      if (score < bestScore) {
        bestScore = score;
        bestMask = m;
        bestMatrix = masked;
      }
    }

    return { matrix: bestMatrix, size };
  }

  function toSVG(text, moduleSize = 4, margin = 4) {
    const qr = generate(text);
    if (!qr) return '';
    const { matrix, size } = qr;
    const totalSize = size * moduleSize + margin * 2;
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="${totalSize}" height="${totalSize}">`;
    svg += `<rect width="${totalSize}" height="${totalSize}" fill="white"/>`;
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        if (matrix[r][c] === 1)
          svg += `<rect x="${margin + c * moduleSize}" y="${margin + r * moduleSize}" width="${moduleSize}" height="${moduleSize}" fill="black"/>`;
    svg += '</svg>';
    return svg;
  }

  function toDataURL(text, moduleSize = 4, margin = 4) {
    const svg = toSVG(text, moduleSize, margin);
    if (!svg) return '';
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  }

  // EPC QR / GiroCode generator for SEPA payments
  function epcQR({ bic, name, iban, amount, reference }) {
    const lines = [
      'BCD',           // Service Tag
      '002',           // Version
      '1',             // Encoding (UTF-8)
      'SCT',           // SEPA Credit Transfer
      bic || '',       // BIC
      name || '',      // Beneficiary name (max 70)
      iban || '',      // IBAN
      amount ? `EUR${amount.toFixed(2)}` : '', // Amount
      '',              // Purpose
      reference || '', // Remittance (max 140)
      '',              // Display text
    ];
    return lines.join('\n');
  }

  return { generate, toSVG, toDataURL, epcQR };
})();
