// BioNexas starter site (GitHub Pages)
// Demos are synthetic: replace with real CSV/JSON later.

(function () {
  const $ = (id) => document.getElementById(id);

  // Footer year
  const yearEl = $("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // ---------- Network data ----------
  const proteins = [
    { id: 1, label: "STAT3", group: "signaling", note: "transcription factor" },
    { id: 2, label: "IL6", group: "cytokine", note: "inflammation cytokine" },
    { id: 3, label: "TNF", group: "cytokine", note: "pro-inflammatory signal" },
    { id: 4, label: "NFKB1", group: "signaling", note: "inflammatory regulator" },
    { id: 5, label: "JAK2", group: "signaling", note: "kinase" },
    { id: 6, label: "CXCL8", group: "cytokine", note: "chemokine" },
    { id: 7, label: "CRP", group: "marker", note: "inflammation marker" },
    { id: 8, label: "MAPK1", group: "signaling", note: "MAP kinase" },
    { id: 9, label: "AKT1", group: "signaling", note: "cell survival signaling" },
    { id: 10, label: "IL1B", group: "cytokine", note: "pro-inflammatory cytokine" },
    { id: 11, label: "TLR4", group: "receptor", note: "innate immune receptor" },
    { id: 12, label: "MYD88", group: "adapter", note: "TLR signaling adapter" }
  ];

  // Edge scores roughly represent confidence/strength
  const edgesBaseline = [
    { from: 2, to: 5, score: 55 },
    { from: 5, to: 1, score: 50 },
    { from: 3, to: 4, score: 45 },
    { from: 10, to: 4, score: 40 },
    { from: 11, to: 12, score: 52 },
    { from: 12, to: 4, score: 42 },
    { from: 8, to: 4, score: 38 },
    { from: 9, to: 1, score: 33 }
  ];

  const edgesInflammation = [
    { from: 2, to: 5, score: 72 },
    { from: 5, to: 1, score: 68 },
    { from: 3, to: 4, score: 76 },
    { from: 10, to: 4, score: 70 },
    { from: 11, to: 12, score: 66 },
    { from: 12, to: 4, score: 74 },
    { from: 6, to: 3, score: 58 },
    { from: 7, to: 2, score: 51 },
    { from: 8, to: 4, score: 62 },
    { from: 9, to: 1, score: 48 },
    { from: 11, to: 4, score: 44 }
  ];

  function formatScore(score) {
    return (score / 100).toFixed(2);
  }

  function buildVisData(condition, minScore) {
    const edgeSet = condition === "baseline" ? edgesBaseline : edgesInflammation;
    const filtered = edgeSet.filter(e => e.score >= minScore);

    const nodes = proteins.map(p => ({
      id: p.id,
      label: p.label,
      group: p.group,
      title: `<b>${p.label}</b><br/>${p.note}`
    }));

    const edges = filtered.map(e => ({
      from: e.from,
      to: e.to,
      value: e.score,
      title: `score: ${formatScore(e.score)}`
    }));

    return { nodes, edges };
  }

  function networkOptions() {
    return {
      interaction: { hover: true, multiselect: true },
      nodes: {
        shape: "dot",
        size: 14,
        font: { color: "#e8ecff", size: 14, face: "system-ui" },
        borderWidth: 1
      },
      edges: {
        color: { color: "rgba(232,236,255,.45)", highlight: "rgba(232,236,255,.95)" },
        smooth: { type: "dynamic" },
        width: 1
      },
      physics: {
        enabled: true,
        stabilization: { iterations: 120 }
      },
      groups: {
        cytokine: { color: { background: "rgba(255,120,120,.75)", border: "rgba(255,120,120,1)" } },
        signaling: { color: { background: "rgba(124,92,255,.75)", border: "rgba(124,92,255,1)" } },
        receptor: { color: { background: "rgba(46,210,255,.70)", border: "rgba(46,210,255,1)" } },
        adapter: { color: { background: "rgba(255,200,120,.70)", border: "rgba(255,200,120,1)" } },
        marker: { color: { background: "rgba(180,255,180,.60)", border: "rgba(180,255,180,1)" } }
      }
    };
  }

  let network = null;
  let heroNetwork = null;

  function renderNetwork(targetId, condition, minScore, updateStats) {
    const container = $(targetId);
    if (!container) return;

    const visData = buildVisData(condition, minScore);
    const data = {
      nodes: new vis.DataSet(visData.nodes),
      edges: new vis.DataSet(visData.edges)
    };

    const instance = new vis.Network(container, data, networkOptions());

    instance.on("click", function (params) {
      if (!params.nodes || params.nodes.length === 0) {
        instance.unselectAll();
        return;
      }
      const nodeId = params.nodes[0];
      const connected = instance.getConnectedNodes(nodeId);

      const allNodes = data.nodes.get();
      const dimIds = allNodes
        .filter(n => n.id !== nodeId && !connected.includes(n.id))
        .map(n => n.id);

      // Dim non-neighbors
      data.nodes.update(dimIds.map(id => ({ id, opacity: 0.25 })));
      data.nodes.update([{ id: nodeId, opacity: 1.0 }].concat(connected.map(id => ({ id, opacity: 1.0 }))));

      // Reset opacity on double click anywhere
    });

    instance.on("doubleClick", function () {
      const allNodes = data.nodes.get().map(n => ({ id: n.id, opacity: 1.0 }));
      data.nodes.update(allNodes);
    });

    // Apply opacity support (vis doesn't use opacity property directly; use color trick)
    const applyOpacity = () => {
      const nodes = data.nodes.get();
      const updated = nodes.map(n => {
        const op = typeof n.opacity === "number" ? n.opacity : 1.0;
        // Keep group colors, adjust only via font color alpha and border alpha
        const font = { color: `rgba(232,236,255,${0.85 * op})` };
        const border = `rgba(232,236,255,${0.35 * op})`;
        return { id: n.id, font, color: { border }, opacity: op };
      });
      data.nodes.update(updated);
    };

    instance.on("afterDrawing", applyOpacity);

    if (updateStats) {
      const nodeCount = visData.nodes.length;
      const edgeCount = visData.edges.length;
      const nEl = $("statNodes");
      const eEl = $("statEdges");
      if (nEl) nEl.textContent = String(nodeCount);
      if (eEl) eEl.textContent = String(edgeCount);
    }

    return instance;
  }

  // Hero preview network
  heroNetwork = renderNetwork("heroNetwork", "inflammation", 55, true);

  // Main network
  const conditionSelect = $("conditionSelect");
  const edgeSlider = $("edgeSlider");
  const edgeSliderValue = $("edgeSliderValue");
  const resetBtn = $("resetNetworkBtn");

  function readMinScore() {
    const v = Number(edgeSlider?.value || 35); // 0..100
    const minScore = v;
    if (edgeSliderValue) edgeSliderValue.textContent = (minScore / 100).toFixed(2);
    return minScore;
  }

  function readCondition() {
    return conditionSelect?.value || "inflammation";
  }

  function rerenderMainNetwork() {
    // wipe container
    const container = $("ppiNetwork");
    if (!container) return;
    container.innerHTML = "";

    const minScore = readMinScore();
    const condition = readCondition();
    network = renderNetwork("ppiNetwork", condition, minScore, false);
  }

  if (conditionSelect) conditionSelect.addEventListener("change", rerenderMainNetwork);
  if (edgeSlider) edgeSlider.addEventListener("input", rerenderMainNetwork);
  if (resetBtn) resetBtn.addEventListener("click", () => {
    if (network) {
      network.fit({ animation: { duration: 350, easingFunction: "easeInOutQuad" } });
      network.unselectAll();
    }
  });

  rerenderMainNetwork();

  // ---------- Volcano plot ----------
  const fcSlider = $("fcSlider");
  const pSlider = $("pSlider");
  const fcValue = $("fcValue");
  const pValue = $("pValue");
  const regenVolcanoBtn = $("regenVolcanoBtn");

  function sliderToFC(v) {
    // v 0..300 -> FC cutoff 0..3 (interpreted as |log2FC| cutoff)
    return (Number(v) / 100).toFixed(2);
  }
  function sliderToP(v) {
    // v 0..300 -> p cutoff ~ 0.5 .. 1e-6 (log scale-ish)
    const x = Number(v) / 300; // 0..1
    const p = Math.pow(10, -(x * 5 + 1)); // 1e-1 .. 1e-6
    return p;
  }

  function updateVolcanoLabels() {
    const fcCut = Number(sliderToFC(fcSlider?.value || 100));
    const pCut = sliderToP(pSlider?.value || 130);
    if (fcValue) fcValue.textContent = `${fcCut.toFixed(2)} (|log2FC|)`;
    if (pValue) pValue.textContent = pCut.toExponential(1);
    return { fcCut, pCut };
  }

  function makeVolcanoPoints(n = 220) {
    // Synthetic: log2FC ~ N(0,1), p ~ mixture
    const xs = [];
    const ys = [];
    const labels = [];

    for (let i = 0; i < n; i++) {
      // Box-Muller for normal-ish distribution
      const u = Math.random() || 1e-9;
      const v = Math.random() || 1e-9;
      const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);

      const log2fc = z * 1.1 + (Math.random() < 0.08 ? (Math.random() < 0.5 ? -2.2 : 2.2) : 0);
      const p = Math.random() < 0.12 ? Math.pow(10, -(2 + Math.random() * 4)) : Math.random();

      xs.push(log2fc);
      ys.push(-Math.log10(Math.max(p, 1e-12)));
      labels.push(`Protein_${i + 1}`);
    }

    return { xs, ys, labels };
  }

  function renderVolcano() {
    const el = $("volcanoPlot");
    if (!el) return;

    const { fcCut, pCut } = updateVolcanoLabels();
    const pts = makeVolcanoPoints(240);

    const yCut = -Math.log10(pCut);

    const trace = {
      x: pts.xs,
      y: pts.ys,
      mode: "markers",
      type: "scattergl",
      text: pts.labels,
      hovertemplate: "<b>%{text}</b><br>log2FC=%{x:.2f}<br>-log10(p)=%{y:.2f}<extra></extra>",
      marker: { size: 7, opacity: 0.85 }
    };

    const layout = {
      margin: { l: 52, r: 18, t: 12, b: 48 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      xaxis: { title: "log2 fold-change", gridcolor: "rgba(255,255,255,.08)", zerolinecolor: "rgba(255,255,255,.12)" },
      yaxis: { title: "-log10(p-value)", gridcolor: "rgba(255,255,255,.08)" },
      shapes: [
        // vertical FC lines
        { type: "line", x0: fcCut, x1: fcCut, y0: 0, y1: 8, line: { width: 1, dash: "dot" } },
        { type: "line", x0: -fcCut, x1: -fcCut, y0: 0, y1: 8, line: { width: 1, dash: "dot" } },
        // horizontal p line
        { type: "line", x0: -4, x1: 4, y0: yCut, y1: yCut, line: { width: 1, dash: "dot" } }
      ]
    };

    const config = { displayModeBar: false, responsive: true };

    Plotly.newPlot(el, [trace], layout, config).catch(() => {});
  }

  if (fcSlider) fcSlider.addEventListener("input", renderVolcano);
  if (pSlider) pSlider.addEventListener("input", renderVolcano);
  if (regenVolcanoBtn) regenVolcanoBtn.addEventListener("click", renderVolcano);

  renderVolcano();

  // ---------- Heatmap ----------
  const heatmapScale = $("heatmapScale");
  const regenHeatmapBtn = $("regenHeatmapBtn");

  function makeHeatmapData(rows = 14, cols = 10) {
    const z = [];
    const yLabels = [];
    const xLabels = [];
    for (let c = 0; c < cols; c++) {
      xLabels.push(c < cols / 2 ? `Ctrl_${c + 1}` : `Infl_${c - Math.floor(cols / 2) + 1}`);
    }

    for (let r = 0; r < rows; r++) {
      yLabels.push(`P${String(r + 1).padStart(2, "0")}`);
      const row = [];
      const base = (Math.random() * 0.5);
      const inflShift = (Math.random() < 0.35 ? (Math.random() < 0.5 ? -1 : 1) : 0) * (0.8 + Math.random());
      for (let c = 0; c < cols; c++) {
        const isInfl = c >= cols / 2;
        const v = base + (isInfl ? inflShift : 0) + (Math.random() - 0.5) * 0.55;
        row.push(v);
      }
      z.push(row);
    }
    return { z, xLabels, yLabels };
  }

  function zScoreByRow(matrix) {
    const out = [];
    for (const row of matrix) {
      const mean = row.reduce((a, b) => a + b, 0) / row.length;
      const sd = Math.sqrt(row.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / row.length) || 1;
      out.push(row.map(v => (v - mean) / sd));
    }
    return out;
  }

  function renderHeatmap() {
    const el = $("heatmap");
    if (!el) return;

    const { z, xLabels, yLabels } = makeHeatmapData(14, 10);
    const mode = heatmapScale?.value || "z";
    const zUsed = mode === "z" ? zScoreByRow(z) : z;

    const trace = {
      type: "heatmap",
      z: zUsed,
      x: xLabels,
      y: yLabels,
      hovertemplate: "<b>%{y}</b><br>%{x}<br>value=%{z:.2f}<extra></extra>"
    };

    const layout = {
      margin: { l: 52, r: 18, t: 12, b: 70 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      xaxis: { tickangle: -35, gridcolor: "rgba(255,255,255,.08)" },
      yaxis: { gridcolor: "rgba(255,255,255,.08)" }
    };

    const config = { displayModeBar: false, responsive: true };
    Plotly.newPlot(el, [trace], layout, config).catch(() => {});
  }

  if (heatmapScale) heatmapScale.addEventListener("change", renderHeatmap);
  if (regenHeatmapBtn) regenHeatmapBtn.addEventListener("click", renderHeatmap);

  renderHeatmap();
})();
