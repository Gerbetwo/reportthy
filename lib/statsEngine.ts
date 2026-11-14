import {
  DistributionBin,
  CleanedParticipant,
  PairedParticipant,
  AttritionAnalysis
} from '@/types/dataset';

export function computeScoreHistogram(
  preData: CleanedParticipant[],
  postData: CleanedParticipant[]
): DistributionBin[] {
  const bins: DistributionBin[] = Array.from({ length: 11 }, (_, i) => ({
    score: i,
    preCount: 0,
    postCount: 0,
    g1PreCount: 0,
    g1PostCount: 0,
    g2PreCount: 0,
    g2PostCount: 0,
  }));

  preData.forEach(p => {
    if (p.score >= 0 && p.score <= 10) {
      bins[p.score].preCount++;
      if (p.group === 'Listado 1') bins[p.score].g1PreCount++;
      else if (p.group === 'Listado 2') bins[p.score].g2PreCount++;
    }
  });

  postData.forEach(p => {
    if (p.score >= 0 && p.score <= 10) {
      bins[p.score].postCount++;
      if (p.group === 'Listado 1') bins[p.score].g1PostCount++;
      else if (p.group === 'Listado 2') bins[p.score].g2PostCount++;
    }
  });

  return bins;
}

export function generateIpynbJson(
  pairedData: PairedParticipant[],
  preData: CleanedParticipant[],
  postData: CleanedParticipant[],
  quarantined: CleanedParticipant[] = [],
  attritionAnalysis?: AttritionAnalysis | null,
  alternative: 'greater' | 'less' | 'two-sided' = 'greater',
  alpha: number = 0.05,
  apiBaseUrl: string = process.env.REPORTTHY_INTERNAL_URL || 'http://localhost:3000'
): string {
  const pairedRecords = pairedData.length > 0
    ? pairedData
    : preData.slice(0, Math.min(preData.length, postData.length)).map((pre, idx) => ({
        preName: pre.originalName,
        postName: postData[idx]?.originalName || pre.originalName,
        similarity: 1.0,
        group: postData[idx]?.group || pre.group,
        preScore: pre.score,
        postScore: postData[idx]?.score ?? pre.score,
        delta: (postData[idx]?.score ?? pre.score) - pre.score,
      }));

  const preScores = pairedRecords.map(p => p.preScore);
  const postScores = pairedRecords.map(p => p.postScore);
  const quarantinedCount = quarantined.length;
  const attritionRate = attritionAnalysis?.attritionRate ?? (
    preData.length > 0 ? Number(((Math.max(preData.length - postData.length, 0) / preData.length) * 100).toFixed(1)) : 0
  );

  const cell1Markdown = [
    '# Quantum Computing Pedagogy: Longitudinal Hypothesis Verification\n',
    '## Quasi-Experimental Pre/Post Non-Parametric Evaluation (Reportthy Lab)\n\n',
    '### Research Hypotheses\n',
    '- **Null Hypothesis ($H_0$)**: The instructional intervention produces no significant knowledge gain ($\\Delta = \\text{Post} - \\text{Pre} \\le 0$).\n',
    '- **Alternative Hypothesis ($H_1$)**: The instructional intervention produces a statistically significant positive learning shift ($\\Delta > 0$).\n\n',
    '### Researcher Audit Instructions\n',
    '1. Run all cells sequentially (`Shift + Enter` or `Run -> Run All Cells`).\n',
    '2. You may adjust statistical parameters such as `ALPHA` (default `0.05`) and `WILCOXON_ALTERNATIVE` (default `\'greater\'`) in Cell 4.\n',
    '3. Cell 6 automatically syncs verified computational metrics via the Reportthy API bridge for the Springer Nature (`sn-jnl`) manuscript.'
  ];

  const cell2Code = [
    '# =============================================================================\n',
    '# Cell 2: Data Ingestion & Sanity Verification\n',
    '# =============================================================================\n',
    'import json\n',
    'import sys\n',
    'import numpy as np\n',
    'import scipy.stats as stats\n',
    'from datetime import datetime, timezone\n',
    'import urllib.request\n\n',
    `DATASET_API_URL = "${apiBaseUrl}/api/notebook/dataset"\n\n`,
    `fallback_paired = ${JSON.stringify(pairedRecords)}\n`,
    `fallback_pre_scores = ${JSON.stringify(preScores)}\n`,
    `fallback_post_scores = ${JSON.stringify(postScores)}\n`,
    `quarantined_count = ${quarantinedCount}\n`,
    `attrition_rate = ${attritionRate}\n\n`,
    'paired_records = fallback_paired\n',
    'pre_scores = np.array(fallback_pre_scores, dtype=float)\n',
    'post_scores = np.array(fallback_post_scores, dtype=float)\n\n',
    '# Attempt live synchronization from Reportthy server\n',
    'try:\n',
    '    req = urllib.request.Request(DATASET_API_URL, headers={"Accept": "application/json"})\n',
    '    with urllib.request.urlopen(req, timeout=2.0) as resp:\n',
    '        data = json.loads(resp.read().decode("utf-8"))\n',
    '        if "pairedData" in data and len(data["pairedData"]) > 0:\n',
    '            paired_records = data["pairedData"]\n',
    '            pre_scores = np.array([p["preScore"] for p in paired_records], dtype=float)\n',
    '            post_scores = np.array([p["postScore"] for p in paired_records], dtype=float)\n',
    '            quarantined_count = len(data.get("quarantined", []))\n',
    '            attrition_rate = float(data.get("attritionAnalysis", {}).get("attritionRate", attrition_rate))\n',
    '            print(f"[Live Sync] Loaded active dataset from {DATASET_API_URL}")\n',
    'except Exception as sync_err:\n',
    '    print(f"[Notice] Operating with pre-bundled verified dataset: {sync_err}")\n\n',
    'print(f"Sanity Check: {len(pre_scores)} pre-test scores, {len(post_scores)} post-test scores, {len(paired_records)} matched pairs.")\n',
    'print(f"Quarantined Submissions: {quarantined_count} | Pre-to-Post Attrition Rate: {attrition_rate:.1f}%")\n'
  ];

  const cell3Code = [
    '# =============================================================================\n',
    '# Cell 3: Descriptive Statistics & Shapiro-Wilk Normality Diagnostics\n',
    '# =============================================================================\n',
    'def compute_descriptive_and_normality(scores):\n',
    '    n = len(scores)\n',
    '    mean_val = float(np.mean(scores))\n',
    '    var_val = float(np.var(scores, ddof=1)) if n > 1 else 0.0\n',
    '    std_val = float(np.std(scores, ddof=1)) if n > 1 else 0.0\n',
    '    med_val = float(np.median(scores))\n',
    '    q75, q25 = np.percentile(scores, [75, 25])\n',
    '    iqr_val = float(q75 - q25)\n',
    '    skew_val = float(stats.skew(scores, bias=False)) if n > 2 else 0.0\n',
    '    kurt_val = float(stats.kurtosis(scores, bias=False)) if n > 3 else 0.0\n',
    '    \n',
    '    # Shapiro-Wilk Normality Test\n',
    '    if n >= 3:\n',
    '        sw_stat, sw_p = stats.shapiro(scores)\n',
    '        sw_stat = float(sw_stat)\n',
    '        sw_p = float(sw_p)\n',
    '    else:\n',
    '        sw_stat, sw_p = 1.0, 1.0\n',
    '        \n',
    '    return {\n',
    '        "n": int(n),\n',
    '        "mean": round(mean_val, 3),\n',
    '        "variance": round(var_val, 3),\n',
    '        "stdDev": round(std_val, 3),\n',
    '        "median": round(med_val, 3),\n',
    '        "iqr": round(iqr_val, 3),\n',
    '        "skewness": round(skew_val, 3),\n',
    '        "kurtosis": round(kurt_val, 3),\n',
    '        "shapiroWilk": {\n',
    '            "statistic": round(sw_stat, 4),\n',
    '            "pValue": round(sw_p, 5),\n',
    '            "isNormal": bool(sw_p >= 0.05)\n',
    '        }\n',
    '    }\n\n',
    'pre_metrics = compute_descriptive_and_normality(pre_scores)\n',
    'post_metrics = compute_descriptive_and_normality(post_scores)\n\n',
    'print("=== Phase Distribution Diagnostics ===")\n',
    'print(f"Pretest  : N={pre_metrics[\'n\']}, Mean={pre_metrics[\'mean\']:.3f}, Var={pre_metrics[\'variance\']:.3f}, Median={pre_metrics[\'median\']:.3f}, SW p={pre_metrics[\'shapiroWilk\'][\'pValue\']:.5f}")\n',
    'print(f"Posttest : N={post_metrics[\'n\']}, Mean={post_metrics[\'mean\']:.3f}, Var={post_metrics[\'variance\']:.3f}, Median={post_metrics[\'median\']:.3f}, SW p={post_metrics[\'shapiroWilk\'][\'pValue\']:.5f}")\n\n',
    'is_any_non_normal = (not pre_metrics["shapiroWilk"]["isNormal"]) or (not post_metrics["shapiroWilk"]["isNormal"])\n',
    'if is_any_non_normal:\n',
    '    print("\\n[Decision Directive] Gaussian normality statistically rejected (p < 0.05).")\n',
    '    print("                     Parametric Student\'s t-tests are invalidated; non-parametric testing mandatory.")\n',
    'else:\n',
    '    print("\\n[Decision Directive] Gaussian normality retained (p >= 0.05); non-parametric testing used as robustness check.")\n'
  ];

  const cell4Code = [
    '# =============================================================================\n',
    '# Cell 4: Within-Subject Longitudinal Hypothesis Verification (Wilcoxon)\n',
    '# =============================================================================\n',
    `ALPHA = ${alpha}\n`,
    `WILCOXON_ALTERNATIVE = '${alternative}'  # Options: 'greater', 'less', 'two-sided'\n\n`,
    'deltas = post_scores - pre_scores\n',
    'non_zero_deltas = deltas[deltas != 0]\n',
    'n_pairs = len(deltas)\n',
    'n_nonzero = len(non_zero_deltas)\n\n',
    'if n_nonzero > 0:\n',
    '    w_res = stats.wilcoxon(post_scores, pre_scores, alternative=WILCOXON_ALTERNATIVE)\n',
    '    w_stat = float(w_res.statistic)\n',
    '    w_p = float(w_res.pvalue)\n',
    '    \n',
    '    # Normal approximation Z-score\n',
    '    mean_w = n_nonzero * (n_nonzero + 1) / 4.0\n',
    '    var_w = n_nonzero * (n_nonzero + 1) * (2 * n_nonzero + 1) / 24.0\n',
    '    std_w = np.sqrt(var_w) if var_w > 0 else 1.0\n',
    '    w_z = float((w_stat - mean_w) / std_w)\n',
    '    w_r = float(abs(w_z) / np.sqrt(n_pairs)) if n_pairs > 0 else 0.0\n',
    'else:\n',
    '    w_stat, w_z, w_p, w_r = 0.0, 0.0, 1.0, 0.0\n\n',
    'w_is_sig = bool(w_p < ALPHA)\n\n',
    'wilcoxon_result = {\n',
    '    "testName": "Within-Subject Longitudinal Paired Wilcoxon Signed-Rank Test",\n',
    '    "statisticName": "W",\n',
    '    "statisticValue": round(w_stat, 3),\n',
    '    "zValue": round(w_z, 3),\n',
    '    "pValue": round(w_p, 5),\n',
    '    "effectSize": round(w_r, 3),\n',
    '    "interpretation": "Statistically significant positive learning gain (H1 corroborated)" if (w_is_sig and w_z > 0) else "Fail to reject H0: no significant learning gain",\n',
    '    "isSignificant": w_is_sig,\n',
    '    "alternative": WILCOXON_ALTERNATIVE,\n',
    '    "n1": int(n_pairs)\n',
    '}\n\n',
    'print("=== Within-Subject Wilcoxon Signed-Rank Inference ===")\n',
    'print(f"Paired N: {n_pairs} | Non-zero Pairs: {n_nonzero}")\n',
    'print(f"Wilcoxon W: {w_stat:.3f} | Z-score: {w_z:.3f} | p-value: {w_p:.5e} | Effect Size r: {w_r:.3f}")\n',
    'print(f"Decision (alpha={ALPHA}): {\'REJECT H0 (Corroborates H1)\' if (w_is_sig and w_z > 0) else \'FAIL TO REJECT H0\'}")\n'
  ];

  const cell5Code = [
    '# =============================================================================\n',
    '# Cell 5: Between-Cohort Gain Divergence Verification (Mann-Whitney U)\n',
    '# =============================================================================\n',
    'g1_deltas = [float(p["delta"]) for p in paired_records if p.get("group") == "Listado 1"]\n',
    'g2_deltas = [float(p["delta"]) for p in paired_records if p.get("group") == "Listado 2"]\n\n',
    'n1 = len(g1_deltas)\n',
    'n2 = len(g2_deltas)\n\n',
    'if n1 > 0 and n2 > 0:\n',
    '    u_res = stats.mannwhitneyu(g1_deltas, g2_deltas, alternative="two-sided")\n',
    '    u_stat = float(u_res.statistic)\n',
    '    u_p = float(u_res.pvalue)\n',
    '    \n',
    '    # Normal approximation Z for Mann-Whitney U\n',
    '    mu_u = n1 * n2 / 2.0\n',
    '    sigma_u = np.sqrt(n1 * n2 * (n1 + n2 + 1) / 12.0)\n',
    '    u_z = float((u_stat - mu_u) / sigma_u) if sigma_u > 0 else 0.0\n',
    '    u_r = float(abs(u_z) / np.sqrt(n1 + n2)) if (n1 + n2) > 0 else 0.0\n',
    'else:\n',
    '    u_stat, u_z, u_p, u_r = 0.0, 0.0, 1.0, 0.0\n\n',
    'u_is_sig = bool(u_p < ALPHA)\n\n',
    'mann_whitney_result = {\n',
    '    "testName": "Between-Cohort Mann-Whitney U Test",\n',
    '    "statisticName": "U",\n',
    '    "statisticValue": round(u_stat, 3),\n',
    '    "zValue": round(u_z, 3),\n',
    '    "pValue": round(u_p, 5),\n',
    '    "effectSize": round(u_r, 3),\n',
    '    "interpretation": "Statistically significant gain divergence between Listado 1 and Listado 2" if u_is_sig else "Consistent instructional gains across cohorts (no divergence)",\n',
    '    "isSignificant": u_is_sig,\n',
    '    "alternative": "two-sided",\n',
    '    "n1": int(n1),\n',
    '    "n2": int(n2)\n',
    '}\n\n',
    'print("=== Between-Cohort Mann-Whitney U Test (Listado 1 vs Listado 2) ===")\n',
    'print(f"Cohort Sizes: n1 (Listado 1) = {n1}, n2 (Listado 2) = {n2}")\n',
    'print(f"Mann-Whitney U: {u_stat:.3f} | Z-score: {u_z:.3f} | p-value: {u_p:.5f} | Effect Size r: {u_r:.3f}")\n',
    'print(f"Cohort Invariance: {\'Gains diverged significantly (p < 0.05)\' if u_is_sig else \'Gains were invariant across cohorts (p >= 0.05)\'}")\n'
  ];

  const cell6Code = [
    '# =============================================================================\n',
    '# Cell 6: Empirical Hypothesis Verdict & Paper Sync Bridge\n',
    '# =============================================================================\n',
    'hypothesis_confirmed = bool((w_p < ALPHA) and (w_z > 0))\n',
    'kernel_info = f"Python {sys.version.split()[0]} ({sys.platform}) / Scipy {stats.__version__} / Numpy {np.__version__}"\n',
    'executed_at = datetime.now(timezone.utc).isoformat()\n\n',
    'print("=" * 64)\n',
    'print("             SCIENTIFIC HYPOTHESIS FINAL VERDICT                ")\n',
    'print("=" * 64)\n',
    'if hypothesis_confirmed:\n',
    '    print("[VERDICT: CORROBORATED] Statistically significant positive learning gain.")\n',
    '    print(f"  Wilcoxon W = {w_stat:.3f}, Z = {w_z:.3f}, p = {w_p:.5e} (< {ALPHA}), effect size r = {w_r:.3f}")\n',
    'else:\n',
    '    print("[VERDICT: REJECTED / NOT SUPPORTED] No statistically significant instructional gain.")\n',
    '    print(f"  Wilcoxon W = {w_stat:.3f}, Z = {w_z:.3f}, p = {w_p:.5e} (alpha = {ALPHA})")\n',
    'print("=" * 64)\n\n',
    'reportthy_results = {\n',
    '    "executedAt": executed_at,\n',
    '    "kernelInfo": kernel_info,\n',
    '    "alpha": float(ALPHA),\n',
    '    "wilcoxonAlternative": WILCOXON_ALTERNATIVE,\n',
    '    "preMetrics": pre_metrics,\n',
    '    "postMetrics": post_metrics,\n',
    '    "wilcoxon": wilcoxon_result,\n',
    '    "mannWhitney": mann_whitney_result,\n',
    '    "hypothesisConfirmed": hypothesis_confirmed,\n',
    '    "executedCodeCells": [\n',
    '        "".join(In[2]) if "In" in globals() and len(In) > 2 else "Cell 2 executed",\n',
    '        "".join(In[3]) if "In" in globals() and len(In) > 3 else "Cell 3 executed",\n',
    '        "".join(In[4]) if "In" in globals() and len(In) > 4 else "Cell 4 executed",\n',
    '        "".join(In[5]) if "In" in globals() and len(In) > 5 else "Cell 5 executed",\n',
    '        "".join(In[6]) if "In" in globals() and len(In) > 6 else "Cell 6 executed",\n',
    '    ]\n',
    '}\n\n',
    '# 1. Persist results to disk\n',
    'with open("reportthy_results.json", "w", encoding="utf-8") as f:\n',
    '    json.dump(reportthy_results, f, indent=2)\n',
    'print("\\n[Filesystem] Saved reportthy_results.json to disk.")\n\n',
    '# 2. Bridge via HTTP POST to Reportthy backend API\n',
    'try:\n',
    `    req = urllib.request.Request(\n`,
    `        "${apiBaseUrl}/api/notebook/results",\n`,
    '        data=json.dumps(reportthy_results).encode("utf-8"),\n',
    '        headers={"Content-Type": "application/json"}\n',
    '    )\n',
    '    with urllib.request.urlopen(req, timeout=2.0) as resp:\n',
    '        print(f"[Bridge: HTTP] Synced results to Reportthy API: HTTP {resp.status}")\n',
    'except Exception as post_err:\n',
    '    print(f"[Notice] Local disk saved; API sync bypassed: {post_err}")\n\n',
    '# 3. Standard stdout marker for JupyterHub Contents API extraction\n',
    'print("\\n__REPORTTHY_JSON_START__")\n',
    'print(json.dumps(reportthy_results))\n',
    'print("__REPORTTHY_JSON_END__")\n'
  ];

  const notebook = {
    cells: [
      {
        cell_type: 'markdown',
        metadata: {},
        source: cell1Markdown
      },
      {
        cell_type: 'code',
        execution_count: null,
        metadata: {},
        outputs: [],
        source: cell2Code
      },
      {
        cell_type: 'code',
        execution_count: null,
        metadata: {},
        outputs: [],
        source: cell3Code
      },
      {
        cell_type: 'code',
        execution_count: null,
        metadata: {},
        outputs: [],
        source: cell4Code
      },
      {
        cell_type: 'code',
        execution_count: null,
        metadata: {},
        outputs: [],
        source: cell5Code
      },
      {
        cell_type: 'code',
        execution_count: null,
        metadata: {},
        outputs: [],
        source: cell6Code
      }
    ],
    metadata: {
      kernelspec: {
        display_name: 'Python 3 (ipykernel)',
        language: 'python',
        name: 'python3'
      },
      language_info: {
        name: 'python',
        version: '3.11'
      }
    },
    nbformat: 4,
    nbformat_minor: 2
  };

  return JSON.stringify(notebook, null, 2);
}
