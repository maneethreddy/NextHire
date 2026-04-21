import { jsPDF } from 'jspdf';

// ─────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────
const C = {
  // Brand
  pink:         [236, 72, 153],
  pinkDark:     [190, 40, 115],
  pinkLight:    [251, 207, 232],
  pinkAlpha:    [236, 72, 153, 0.15],

  // Neutrals
  black:        [6, 0, 16],
  darkBg:       [12, 8, 26],
  darkCard:     [22, 16, 40],
  border:       [45, 35, 65],
  text:         [255, 255, 255],
  textSub:      [180, 170, 200],
  textMuted:    [110, 100, 130],
  lightBg:      [248, 246, 255],
  lightCard:    [242, 238, 252],
  lightBorder:  [220, 215, 235],
  bodyText:     [40, 32, 60],

  // Semantic
  green:        [34, 197, 94],
  greenBg:      [240, 253, 244],
  greenBorder:  [187, 247, 208],
  yellow:       [245, 158, 11],
  yellowBg:     [255, 251, 235],
  yellowBorder: [253, 230, 138],
  red:          [239, 68, 68],
  redBg:        [254, 242, 242],
  redBorder:    [252, 165, 165],

  white:        [255, 255, 255],
};

const PAGE_W    = 210;
const PAGE_H    = 297;
const MARGIN    = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;

// ─────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────
const clamp = (v, lo, hi) => Math.min(Math.max(v ?? 0, lo), hi);

const scoreColor = (s) => {
  if (s >= 75) return { text: C.green, bg: C.greenBg, border: C.greenBorder, label: 'Excellent' };
  if (s >= 50) return { text: C.yellow, bg: C.yellowBg, border: C.yellowBorder, label: 'Good' };
  return { text: C.red, bg: C.redBg, border: C.redBorder, label: 'Needs Work' };
};

const pct = (v) => (v !== null && v !== undefined ? `${Math.round(v * 100)}%` : 'N/A');

const wrap = (doc, text, x, y, maxW, lineH = 6) => {
  const lines = doc.splitTextToSize(String(text || '—'), maxW);
  lines.forEach(line => { doc.text(line, x, y); y += lineH; });
  return y;
};

const newPage = (doc, y, need = 30) => {
  if (y + need > PAGE_H - MARGIN - 16) { doc.addPage(); return MARGIN + 8; }
  return y;
};

// Draw a rectangle with top-left & top-right rounded corners only (simulate via filled rect + corner covers)
const topCard = (doc, x, y, w, h, r, fillColor) => {
  doc.setFillColor(...fillColor);
  doc.roundedRect(x, y, w, h, r, r, 'F');
};

// ─────────────────────────────────────────────────
// SECTION DIVIDER
// ─────────────────────────────────────────────────
const sectionDiv = (doc, title, icon, y) => {
  y = newPage(doc, y, 24);

  // Left accent bar
  doc.setFillColor(...C.pink);
  doc.rect(MARGIN, y - 1, 3.5, 11, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...C.bodyText);
  doc.text(`${icon}  ${title}`, MARGIN + 7, y + 7.5);

  // Underline
  doc.setDrawColor(...C.lightBorder);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y + 13, PAGE_W - MARGIN, y + 13);

  return y + 20;
};

// ─────────────────────────────────────────────────
// METRIC ROW
// ─────────────────────────────────────────────────
const metricRow = (doc, abbr, fullName, value, y) => {
  y = newPage(doc, y, 16);

  const barX    = MARGIN + 52;
  const barW    = CONTENT_W - 68;
  const fillW   = barW * clamp(value, 0, 1);
  const col     = scoreColor(clamp(value, 0, 1) * 100);
  const pctStr  = pct(value);

  // Row background
  doc.setFillColor(...C.lightCard);
  doc.roundedRect(MARGIN, y - 5, CONTENT_W, 12, 2, 2, 'F');

  // Abbreviation badge
  doc.setFillColor(...C.pink);
  doc.roundedRect(MARGIN + 2, y - 3, 12, 8, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.white);
  doc.text(abbr, MARGIN + 4, y + 2.5);

  // Full name
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.bodyText);
  doc.text(fullName, MARGIN + 17, y + 2.5);

  // Bar track
  doc.setFillColor(220, 215, 235);
  doc.roundedRect(barX, y - 1.5, barW, 5, 1.5, 1.5, 'F');

  // Bar fill
  if (fillW > 0) {
    doc.setFillColor(...col.text);
    doc.roundedRect(barX, y - 1.5, fillW, 5, 1.5, 1.5, 'F');
  }

  // Percentage
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...col.text);
  doc.text(pctStr, barX + barW + 3, y + 2.5);

  return y + 14;
};

// ─────────────────────────────────────────────────
// QUESTION CARD
// ─────────────────────────────────────────────────
const questionCard = (doc, question, result, answerObj, idx, y) => {
  const qScore   = result?.score10 != null ? result.score10 * 10 : (result?.weightedScore ?? 0);
  const rounded  = Math.round(qScore);
  const col      = scoreColor(rounded);
  const label    = result?.correctnessLabel || col.label;
  const indices  = result?.indices || {};

  // Estimate height needed
  const qLines    = doc.splitTextToSize(question.text || '', CONTENT_W - 30).length;
  const fbLines   = result?.feedback ? doc.splitTextToSize(result.feedback.slice(0, 300), CONTENT_W - 10).length : 0;
  const ansLines  = answerObj?.text ? doc.splitTextToSize((answerObj.text.slice(0, 250)), CONTENT_W - 10).length : 0;
  const estH      = 22 + qLines * 6.5 + fbLines * 5.5 + ansLines * 5.5 + 30;
  y = newPage(doc, y, estH);

  // ── Card background ───────────────────────────
  doc.setFillColor(...col.bg);
  doc.setDrawColor(...col.border);
  doc.setLineWidth(0.5);
  doc.roundedRect(MARGIN, y, CONTENT_W, estH - 4, 3, 3, 'FD');

  const startY = y;

  // ── Header strip ─────────────────────────────
  doc.setFillColor(...col.text);
  // Left rounded notch
  doc.roundedRect(MARGIN, y, CONTENT_W, 12, 3, 3, 'F');
  // Patch bottom corners to be square
  doc.rect(MARGIN, y + 6, CONTENT_W, 6, 'F');

  // Q number
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...C.white);
  doc.text(`Q${idx + 1}`, MARGIN + 4, y + 8.5);

  // Label
  doc.setFontSize(9);
  doc.text(label, MARGIN + 14, y + 8.5);

  // Score on right
  const scoreStr = `${rounded}/100`;
  doc.setFontSize(11);
  doc.text(scoreStr, PAGE_W - MARGIN - doc.getTextWidth(scoreStr) - 3, y + 8.5);

  y += 15;

  // ── Question text ─────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...C.bodyText);
  y = wrap(doc, question.text, MARGIN + 4, y, CONTENT_W - 8, 6.5);
  y += 2;

  // ── Mini indices ─────────────────────────────
  const idxPairs = [
    ['CLT', indices.clt],
    ['TAI', indices.tai],
    ['ACE', indices.ace],
    ['EDD', indices.edd],
  ];
  const boxW = (CONTENT_W - 8) / 4;
  idxPairs.forEach(([key, val], ki) => {
    const bx = MARGIN + 4 + ki * boxW;
    doc.setFillColor(...col.border);
    doc.roundedRect(bx, y, boxW - 2, 11, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...col.text);
    doc.text(key, bx + 2, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(pct(val), bx + 2, y + 10);
  });
  y += 16;

  // ── Answer preview ────────────────────────────
  if (answerObj?.text) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(90, 80, 115);
    const truncAns = answerObj.text.length > 250 ? answerObj.text.slice(0, 250) + '…' : answerObj.text;
    y = wrap(doc, `"${truncAns}"`, MARGIN + 4, y, CONTENT_W - 8, 5.5);
    y += 3;
  }

  // ── AI Feedback ───────────────────────────────
  if (result?.feedback) {
    // Thin separator
    doc.setDrawColor(...col.border);
    doc.setLineWidth(0.3);
    doc.line(MARGIN + 4, y, PAGE_W - MARGIN - 4, y);
    y += 4;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...col.text);
    doc.text('AI Feedback:', MARGIN + 4, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.bodyText);
    const truncFb = result.feedback.length > 300 ? result.feedback.slice(0, 300) + '…' : result.feedback;
    y = wrap(doc, truncFb, MARGIN + 4, y, CONTENT_W - 8, 5.5);
    y += 2;
  }

  return Math.max(y, startY + estH) + 6;
};

// ─────────────────────────────────────────────────
// MAIN: generatePDF
// ─────────────────────────────────────────────────
export const generatePDF = (reportData = {}) => {
  const {
    role = 'Unknown Role',
    date,
    overallScore = 0,
    sessionIndices = {},
    questionResults = [],
    questions = [],
    answers = [],
  } = reportData;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const formattedDate = date
    ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // ══════════════════════════════════════════════
  // PAGE 1: COVER
  // ══════════════════════════════════════════════

  // Full dark background
  doc.setFillColor(...C.darkBg);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  // Top gradient band (simulated with stacked rects, lighter → darker)
  for (let i = 0; i < 80; i++) {
    const ratio = i / 80;
    const r = Math.round(C.pink[0] * (1 - ratio) + C.darkBg[0] * ratio);
    const g = Math.round(C.pink[1] * (1 - ratio) + C.darkBg[1] * ratio);
    const b = Math.round(C.pink[2] * (1 - ratio) + C.darkBg[2] * ratio);
    doc.setFillColor(r, g, b);
    doc.rect(0, i * 1.2, PAGE_W, 1.3, 'F');
  }

  // Cover card (white frosted card in the center)
  const cardX = 30, cardY = 100, cardW = PAGE_W - 60, cardH = 110;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(cardX, cardY, cardW, cardH, 6, 6, 'F');

  // Pink top border on card
  doc.setFillColor(...C.pink);
  doc.roundedRect(cardX, cardY, cardW, 5, 3, 3, 'F');
  doc.rect(cardX, cardY + 2, cardW, 3, 'F'); // patch to square bottom

  // NextHire logo text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...C.pink);
  const logoText = 'NextHire';
  doc.text(logoText, PAGE_W / 2 - doc.getTextWidth(logoText) / 2, cardY + 22);

  // Report subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...C.textMuted);
  const sub = 'Interview Performance Report';
  doc.text(sub, PAGE_W / 2 - doc.getTextWidth(sub) / 2, cardY + 33);

  // Divider
  doc.setDrawColor(...C.lightBorder);
  doc.setLineWidth(0.4);
  doc.line(cardX + 10, cardY + 40, cardX + cardW - 10, cardY + 40);

  // Role & Date info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...C.bodyText);
  doc.text('Role', cardX + 15, cardY + 54);
  doc.text('Date', cardX + 15, cardY + 65);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 60, 90);
  doc.text(role, cardX + 35, cardY + 54);
  doc.text(formattedDate, cardX + 35, cardY + 65);

  // Score circle
  const scoreClr = scoreColor(overallScore);
  const cx = cardX + cardW - 28, cy = cardY + 63;
  doc.setFillColor(...scoreClr.text);
  doc.circle(cx, cy, 21, 'F');
  doc.setFillColor(255, 255, 255);
  doc.circle(cx, cy, 17.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...scoreClr.text);
  const sStr = String(overallScore);
  doc.text(sStr, cx - doc.getTextWidth(sStr) / 2, cy + 3);
  doc.setFontSize(7.5);
  doc.setTextColor(...C.textMuted);
  doc.text('/100', cx - doc.getTextWidth('/100') / 2, cy + 10);

  // Performance label below card
  const perfLabel = overallScore >= 80 ? '🏆 Excellent Performance' : overallScore >= 60 ? '✅ Good Performance' : '⚠️ Needs Improvement';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...scoreClr.text);
  doc.text(perfLabel, PAGE_W / 2 - doc.getTextWidth(perfLabel) / 2, cardY + cardH + 12);

  // Session stats at bottom of cover
  const statsY = cardY + cardH + 28;
  const stats = [
    { label: 'Questions', value: String(questions.length) },
    { label: 'Avg Score', value: `${overallScore}%` },
    { label: 'Status', value: scoreClr.label },
  ];
  const statW = 40;
  stats.forEach((st, si) => {
    const sx = PAGE_W / 2 - (stats.length * statW) / 2 + si * statW + statW / 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...C.pink);
    doc.text(st.value, sx - doc.getTextWidth(st.value) / 2, statsY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.textSub);
    doc.text(st.label, sx - doc.getTextWidth(st.label) / 2, statsY + 7);
  });

  // Bottom brand bar
  doc.setFillColor(...C.pink);
  doc.rect(0, PAGE_H - 14, PAGE_W, 14, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...C.white);
  doc.text('NextHire — AI-Powered Interview Coach', MARGIN, PAGE_H - 5.5);
  doc.setFont('helvetica', 'normal');
  doc.text('nexthire.ai', PAGE_W - MARGIN - doc.getTextWidth('nexthire.ai'), PAGE_H - 5.5);

  // ══════════════════════════════════════════════
  // PAGE 2+: CONTENT
  // ══════════════════════════════════════════════
  doc.addPage();

  // Light background for content pages
  doc.setFillColor(...C.lightBg);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  let y = MARGIN;

  // ── Page header ───────────────────────────────
  doc.setFillColor(...C.white);
  doc.rect(0, 0, PAGE_W, 16, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...C.pink);
  doc.text('NextHire', MARGIN, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...C.textMuted);
  const headerTitle = `${role} — Interview Report`;
  doc.text(headerTitle, PAGE_W - MARGIN - doc.getTextWidth(headerTitle), 11);
  doc.setDrawColor(...C.lightBorder);
  doc.setLineWidth(0.3);
  doc.line(0, 16, PAGE_W, 16);
  y = 24;

  // ── METRICS ───────────────────────────────────
  y = sectionDiv(doc, 'Performance Metrics', '📊', y);

  const INDICES = [
    { key: 'clt', abbr: 'CLT', name: 'Cognitive Latency Tolerance' },
    { key: 'tai', abbr: 'TAI', name: 'Terminology Alignment Index' },
    { key: 'ace', abbr: 'ACE', name: 'Answer Compression Efficiency' },
    { key: 'edd', abbr: 'EDD', name: 'Expectation Drift Detection' },
    { key: 'iri', abbr: 'IRI', name: 'Interview Robustness Index' },
  ];

  INDICES.forEach(({ key, abbr, name }) => {
    y = metricRow(doc, abbr, name, sessionIndices[key] ?? null, y);
  });

  y += 6;

  // ── STRENGTHS & WEAKNESSES ───────────────────
  y = sectionDiv(doc, 'Strengths & Areas for Improvement', '💡', y);

  const strong = questionResults.filter(r => (r.score10 ?? r.weightedScore / 10 ?? 0) >= 7);
  const weak   = questionResults.filter(r => (r.score10 ?? r.weightedScore / 10 ?? 0) < 6);

  // Strengths box
  doc.setFillColor(...C.greenBg);
  doc.setDrawColor(...C.greenBorder);
  doc.setLineWidth(0.4);
  const swBoxY = y;
  const swLines = strong.length ? strong.length : 1;
  const swH = 10 + swLines * 8;
  doc.roundedRect(MARGIN, swBoxY, (CONTENT_W - 6) / 2, swH, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...C.green);
  doc.text('✓ Strengths', MARGIN + 4, swBoxY + 8);

  if (strong.length) {
    strong.forEach((r, ri) => {
      const qi = questionResults.indexOf(r);
      y = newPage(doc, swBoxY + 14 + ri * 8, 8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...C.bodyText);
      const t = (questions[qi]?.text || `Q${qi + 1}`).slice(0, 50) + ((questions[qi]?.text?.length > 50) ? '…' : '');
      doc.text(`Q${qi + 1}: ${t}`, MARGIN + 4, swBoxY + 14 + ri * 8);
    });
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.textMuted);
    doc.text('No strong answers yet — keep practising!', MARGIN + 4, swBoxY + 14);
  }

  // Weaknesses box
  const weakBoxX = MARGIN + (CONTENT_W - 6) / 2 + 6;
  const weakBoxW = (CONTENT_W - 6) / 2;
  const wkLines  = weak.length ? weak.length : 1;
  const wkH      = 10 + wkLines * 8;
  const boxH     = Math.max(swH, wkH);

  doc.setFillColor(...C.redBg);
  doc.setDrawColor(...C.redBorder);
  doc.roundedRect(weakBoxX, swBoxY, weakBoxW, boxH, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...C.red);
  doc.text('✗ Areas for Improvement', weakBoxX + 4, swBoxY + 8);

  if (weak.length) {
    weak.forEach((r, ri) => {
      const qi = questionResults.indexOf(r);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...C.bodyText);
      const t = (questions[qi]?.text || `Q${qi + 1}`).slice(0, 50) + ((questions[qi]?.text?.length > 50) ? '…' : '');
      doc.text(`Q${qi + 1}: ${t}`, weakBoxX + 4, swBoxY + 14 + ri * 8);
    });
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.textMuted);
    doc.text('No major weak areas — great job!', weakBoxX + 4, swBoxY + 14);
  }

  y = swBoxY + boxH + 10;

  // ── PER-QUESTION DETAIL ──────────────────────
  y = sectionDiv(doc, 'Per-Question Evaluation', '❓', y);

  questions.forEach((question, i) => {
    y = questionCard(doc, question, questionResults[i] || {}, answers[i], i, y);
    // Refresh light bg on new pages
  });

  // ── FOOTER on every page ─────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 2; p <= totalPages; p++) {
    doc.setPage(p);
    // Ensure light bg (re-paint)
    // Header
    doc.setFillColor(...C.white);
    doc.rect(0, 0, PAGE_W, 16, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...C.pink);
    doc.text('NextHire', MARGIN, 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C.textMuted);
    const ht = `${role} — Interview Report`;
    doc.text(ht, PAGE_W - MARGIN - doc.getTextWidth(ht), 11);
    doc.setDrawColor(...C.lightBorder);
    doc.setLineWidth(0.3);
    doc.line(0, 16, PAGE_W, 16);

    // Footer
    doc.setFillColor(...C.darkBg);
    doc.rect(0, PAGE_H - 12, PAGE_W, 12, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(170, 160, 190);
    doc.text('NextHire — AI-Powered Interview Coach', MARGIN, PAGE_H - 4.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.pink);
    doc.text(`${p} / ${totalPages}`, PAGE_W - MARGIN - 10, PAGE_H - 4.5);
  }

  // ── SAVE ─────────────────────────────────────
  const safeName = role.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`NextHire_Report_${safeName}_${Date.now()}.pdf`);
};
