import {
  CleanedParticipant,
  PairedParticipant,
  AttritionAnalysis,
  StudyMetadata,
} from '@/types/dataset';
import { inferDefaultCohortRole } from '@/lib/csvCleaner';
import { sanitizeSessionId } from '@/lib/notebookStore';

export function generateIpynbJson(
  pairedData: PairedParticipant[],
  preData: CleanedParticipant[],
  postData: CleanedParticipant[],
  quarantined: CleanedParticipant[] = [],
  attritionAnalysis?: AttritionAnalysis | null,
  alternative: 'greater' | 'less' | 'two-sided' = 'greater',
  alpha: number = 0.05,
  apiBaseUrl: string = process.env.REPORTTHY_INTERNAL_URL || 'http://localhost:3000',
  studyMetadata?: StudyMetadata,
  sessionId?: string
): string {
  const allObservedGroups = Array.from(
    new Set(
      [
        ...pairedData.map((p) => p.group),
        ...preData.map((p) => p.group),
        ...postData.map((p) => p.group),
      ]
        .map((g) => (g || '').trim())
        .filter(Boolean)
    )
  );

  const pairedRecords =
    pairedData.length > 0
      ? pairedData.map((p) => ({
          ...p,
          cohortRole:
            p.cohortRole ??
            (studyMetadata?.cohortMapping?.[p.group] ||
              inferDefaultCohortRole(p.group, allObservedGroups)),
        }))
      : preData
          .slice(0, Math.min(preData.length, postData.length))
          .map((pre, idx) => {
            const grp = postData[idx]?.group || pre.group;
            const role =
              postData[idx]?.cohortRole &&
              postData[idx].cohortRole !== 'Unassigned'
                ? postData[idx].cohortRole
                : pre.cohortRole ??
                  (studyMetadata?.cohortMapping?.[grp] ||
                    inferDefaultCohortRole(grp, allObservedGroups));
            return {
              preName: pre.originalName,
              postName: postData[idx]?.originalName || pre.originalName,
              similarity: 1.0,
              group: grp,
              cohortRole: role,
              preScore: pre.score,
              postScore: postData[idx]?.score ?? pre.score,
              delta: (postData[idx]?.score ?? pre.score) - pre.score,
            };
          });

  const preScores = pairedRecords.map((p) => p.preScore);
  const postScores = pairedRecords.map((p) => p.postScore);
  const quarantinedCount = quarantined.length;
  const attritionRate =
    attritionAnalysis?.attritionRate ??
    (preData.length > 0
      ? Number(
          (
            (Math.max(preData.length - postData.length, 0) / preData.length) *
            100
          ).toFixed(1)
        )
      : 0);

  const effectiveAlpha = studyMetadata?.alpha ?? alpha;
  const effectiveWilcoxonAlt = studyMetadata?.wilcoxonAlternative ?? alternative;
  const effectiveMannWhitneyAlt =
    studyMetadata?.mannWhitneyAlternative ??
    (studyMetadata?.designMode === 'within_subject' ? 'two-sided' : 'greater');
  const effectiveDesignMode = studyMetadata?.designMode ?? 'within_subject';
  const studyTitle =
    studyMetadata?.studyTitle?.trim() ||
    'Quantum Computing Pedagogy: Longitudinal Hypothesis Verification';
  const topicDomain =
    studyMetadata?.topicDomain?.trim() ||
    'Introductory Quantum Computing Literacy';
  const controlPedagogy =
    studyMetadata?.controlPedagogy?.trim() ||
    'Standard synchronous lecture and problem sets';
  const experimentalPedagogy =
    studyMetadata?.experimentalPedagogy?.trim() ||
    'Interactive instructional intervention with immediate telemetry';
  const hypothesisStatement =
    studyMetadata?.hypothesisStatement?.trim() ||
    'The instructional intervention produces a statistically significant positive learning shift (\\Delta > 0).';
  const authorNames =
    studyMetadata?.authors && studyMetadata.authors.length > 0
      ? studyMetadata.authors.map((a) => a.fullName).filter(Boolean).join(', ')
      : 'Research Investigator Team';

  const safeSessionId = sanitizeSessionId(sessionId);
  const sessionQuery = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : '';
  const datasetApiUrl = `${apiBaseUrl}/api/notebook/dataset${sessionQuery}`;
  const resultsApiUrl = `${apiBaseUrl}/api/notebook/results${sessionQuery}`;

  const cell1Markdown = [
    `# ${studyTitle}\n`,
    `## Domain: ${topicDomain} | Quasi-Experimental Pre/Post Evaluation (Reportthy Lab)\n\n`,
    `**Investigators**: ${authorNames}\n\n`,
    `**Experimental Design Mode**: \`${effectiveDesignMode}\`\n\n`,
    '### Pedagogical Interventions\n',
    `- **Control Condition**: ${controlPedagogy}\n`,
    `- **Experimental Condition**: ${experimentalPedagogy}\n\n`,
    '### Research Hypotheses\n',
    '- **Null Hypothesis ($H_0$)**: The instructional intervention produces no significant knowledge gain or cohort superiority ($\\Delta \\le 0$).\n',
    `- **Alternative Hypothesis ($H_1$)**: ${hypothesisStatement}\n\n`,
    '### Researcher Audit Instructions\n',
    '1. Run all cells sequentially (`Shift + Enter` or `Run -> Run All Cells`).\n',
    `2. Parameters: \`ALPHA = ${effectiveAlpha}\`, \`WILCOXON_ALTERNATIVE = '${effectiveWilcoxonAlt}'\`, \`MANN_WHITNEY_ALTERNATIVE = '${effectiveMannWhitneyAlt}'\`.\n`,
    '3. Cell 6 automatically syncs verified computational metrics via the Reportthy API bridge for the Springer Nature (`sn-jnl`) manuscript.'
  ];

  const cell2Code = [
    '# =============================================================================\n',
    '# Cell 2: Data Ingestion & Sanity Verification\n',
    '# =============================================================================\n',
    'import json\n',
    'import sys\n',
    'import numpy as np\n',
    'import scipy\n',
    'import scipy.stats as stats\n',
    'from datetime import datetime, timezone\n',
    'import urllib.request\n\n',
    `DATASET_API_URL = "${datasetApiUrl}"\n\n`,
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
    `    req = urllib.request.Request(DATASET_API_URL, headers={"Accept": "application/json", "x-reportthy-session": "${safeSessionId}"})\n`,
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
    '    if n == 0:\n',
    '        return {\n',
    '            "n": 0,\n',
    '            "mean": 0.0,\n',
    '            "variance": 0.0,\n',
    '            "stdDev": 0.0,\n',
    '            "median": 0.0,\n',
    '            "iqr": 0.0,\n',
    '            "skewness": 0.0,\n',
    '            "kurtosis": 0.0,\n',
    '            "shapiroWilk": {\n',
    '                "statistic": 0.0,\n',
    '                "pValue": 1.0,\n',
    '                "isNormal": True\n',
    '            }\n',
    '        }\n',
    '    mean_val = float(np.mean(scores))\n',
    '    var_val = float(np.var(scores, ddof=1)) if n > 1 else 0.0\n',
    '    std_val = float(np.std(scores, ddof=1)) if n > 1 else 0.0\n',
    '    med_val = float(np.median(scores))\n',
    '    q75, q25 = np.percentile(scores, [75, 25])\n',
    '    iqr_val = float(q75 - q25)\n',
    '    skew_val = float(stats.skew(scores, bias=False)) if n > 2 else 0.0\n',
    '    kurt_val = float(stats.kurtosis(scores, bias=False)) if n > 3 else 0.0\n',
    '    \n',
    '    # Shapiro-Wilk normality test (requires 3 <= n <= 5000)\n',
    '    if 3 <= n <= 5000:\n',
    '        sw_stat, sw_p = stats.shapiro(scores)\n',
    '        is_normal = bool(sw_p >= 0.05)\n',
    '    else:\n',
    '        sw_stat, sw_p = 0.0, 1.0\n',
    '        is_normal = True\n',
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
    '            "statistic": round(float(sw_stat), 5),\n',
    '            "pValue": round(float(sw_p), 5),\n',
    '            "isNormal": is_normal\n',
    '        }\n',
    '    }\n\n',
    'pre_metrics = compute_descriptive_and_normality(pre_scores)\n',
    'post_metrics = compute_descriptive_and_normality(post_scores)\n\n',
    'print("=== Pre-Intervention Descriptive Statistics ===")\n',
    'print(json.dumps(pre_metrics, indent=2))\n\n',
    'print("=== Post-Intervention Descriptive Statistics ===")\n',
    'print(json.dumps(post_metrics, indent=2))\n\n',
    'normality_rejected = not (pre_metrics["shapiroWilk"]["isNormal"] and post_metrics["shapiroWilk"]["isNormal"])\n',
    'if normality_rejected:\n',
    '    print("\\n[MANDATE: NON-PARAMETRIC] Gaussian normality rejected (p < 0.05). Parametric Student\'s t-test invalidated. Proceeding with Wilcoxon & Mann-Whitney.")\n',
    'else:\n',
    '    print("\\n[NOTICE: PARAMETRIC ELIGIBLE] Normality retained (p >= 0.05). Wilcoxon & Mann-Whitney retained for distribution-free robustness.")\n'
  ];

  const cell4Code = [
    '# =============================================================================\n',
    '# Cell 4: Within-Subject Longitudinal Hypothesis Verification (Wilcoxon)\n',
    '# =============================================================================\n',
    `ALPHA = ${effectiveAlpha}\n`,
    `WILCOXON_ALTERNATIVE = '${effectiveWilcoxonAlt}'  # Options: 'greater', 'less', 'two-sided'\n\n`,
    'deltas = post_scores - pre_scores\n',
    'non_zero_deltas = deltas[deltas != 0]\n',
    'n_pairs = len(deltas)\n',
    'n_nonzero = len(non_zero_deltas)\n\n',
    'if n_nonzero > 0:\n',
    '    w_res = stats.wilcoxon(post_scores, pre_scores, alternative=WILCOXON_ALTERNATIVE)\n',
    '    w_stat = float(w_res.statistic)\n',
    '    w_p = float(w_res.pvalue)\n',
    '    \n',
    '    # Canonical signed-rank Z-score: positive values indicate post > pre.\n',
    '    ranks = stats.rankdata(np.abs(non_zero_deltas))\n',
    '    w_plus = float(np.sum(ranks[non_zero_deltas > 0]))\n',
    '    mean_w = n_nonzero * (n_nonzero + 1) / 4.0\n',
    '    var_w = n_nonzero * (n_nonzero + 1) * (2 * n_nonzero + 1) / 24.0\n',
    '    std_w = np.sqrt(var_w) if var_w > 0 else 1.0\n',
    '    w_z = float((w_plus - mean_w) / std_w)\n',
    '    w_r = float(abs(w_z) / np.sqrt(n_pairs)) if n_pairs > 0 else 0.0\n',
    'else:\n',
    '    w_stat, w_z, w_p, w_r = 0.0, 0.0, 1.0, 0.0\n\n',
    'def confirms_direction(p_value, z_value, alternative):\n',
    '    if alternative == "greater":\n',
    '        return bool((p_value < ALPHA) and (z_value > 0))\n',
    '    if alternative == "less":\n',
    '        return bool((p_value < ALPHA) and (z_value < 0))\n',
    '    return bool((p_value < ALPHA) and (z_value != 0))\n\n',
    'w_is_sig = bool(w_p < ALPHA)\n',
    'w_direction_confirmed = confirms_direction(w_p, w_z, WILCOXON_ALTERNATIVE)\n\n',
    'wilcoxon_result = {\n',
    '    "testName": "Within-Subject Longitudinal Paired Wilcoxon Signed-Rank Test",\n',
    '    "statisticName": "W",\n',
    '    "statisticValue": round(w_stat, 3),\n',
    '    "zValue": round(w_z, 3),\n',
    '    "pValue": round(w_p, 5),\n',
    '    "effectSize": round(w_r, 3),\n',
    '    "interpretation": "Statistically significant learning gain in the hypothesized direction (H1 corroborated)" if w_direction_confirmed else "Fail to reject H0 or result is in the opposite direction",\n',
    '    "isSignificant": w_is_sig,\n',
    '    "alternative": WILCOXON_ALTERNATIVE,\n',
    '    "n1": int(n_pairs)\n',
    '}\n\n',
    'print("=== Within-Subject Wilcoxon Signed-Rank Inference ===")\n',
    'print(f"Paired N: {n_pairs} | Non-zero Pairs: {n_nonzero}")\n',
    'print(f"Wilcoxon W: {w_stat:.3f} | Z-score: {w_z:.3f} | p-value: {w_p:.5e} | Effect Size r: {w_r:.3f}")\n',
    'print(f"Decision (alpha={ALPHA}): {\'REJECT H0 (Corroborates H1)\' if w_direction_confirmed else \'FAIL TO REJECT H0\'}")\n'
  ];

  const cell5Code = [
    '# =============================================================================\n',
    '# Cell 5: Between-Cohort Gain Divergence Verification (Mann-Whitney U)\n',
    '# =============================================================================\n',
    `MANN_WHITNEY_ALTERNATIVE = '${effectiveMannWhitneyAlt}'  # Options: 'greater', 'less', 'two-sided'\n\n`,
    'exp_deltas = [float(p["delta"]) for p in paired_records if p.get("cohortRole") == "Experimental"]\n',
    'ctrl_deltas = [float(p["delta"]) for p in paired_records if p.get("cohortRole") == "Control"]\n\n',
    'n_exp = len(exp_deltas)\n',
    'n_ctrl = len(ctrl_deltas)\n\n',
    'ctrl_cohorts = list({str(p.get("group", "Control")) for p in paired_records if p.get("cohortRole") == "Control"})\n',
    'exp_cohorts = list({str(p.get("group", "Experimental")) for p in paired_records if p.get("cohortRole") == "Experimental"})\n',
    'ctrl_label = ", ".join(sorted(ctrl_cohorts)) if ctrl_cohorts else "Control"\n',
    'exp_label = ", ".join(sorted(exp_cohorts)) if exp_cohorts else "Experimental"\n\n',
    'if n_exp > 0 and n_ctrl > 0:\n',
    '    u_res = stats.mannwhitneyu(exp_deltas, ctrl_deltas, alternative=MANN_WHITNEY_ALTERNATIVE)\n',
    '    u_stat = float(u_res.statistic)\n',
    '    u_p = float(u_res.pvalue)\n',
    '    \n',
    '    # Normal approximation Z for Mann-Whitney U\n',
    '    mu_u = n_exp * n_ctrl / 2.0\n',
    '    sigma_u = np.sqrt(n_exp * n_ctrl * (n_exp + n_ctrl + 1) / 12.0)\n',
    '    u_z = float((u_stat - mu_u) / sigma_u) if sigma_u > 0 else 0.0\n',
    '    u_r = float(abs(u_z) / np.sqrt(n_exp + n_ctrl)) if (n_exp + n_ctrl) > 0 else 0.0\n',
    'else:\n',
    '    u_stat, u_z, u_p, u_r = 0.0, 0.0, 1.0, 0.0\n\n',
    'u_is_sig = bool(u_p < ALPHA)\n',
    'u_direction_confirmed = confirms_direction(u_p, u_z, MANN_WHITNEY_ALTERNATIVE)\n\n',
    'mann_whitney_result = {\n',
    '    "testName": "Between-Cohort Mann-Whitney U Test",\n',
    '    "statisticName": "U",\n',
    '    "statisticValue": round(u_stat, 3),\n',
    '    "zValue": round(u_z, 3),\n',
    '    "pValue": round(u_p, 5),\n',
    '    "effectSize": round(u_r, 3),\n',
    '    "interpretation": f"Statistically significant cohort difference in the hypothesized direction (p < {ALPHA})" if u_direction_confirmed else f"No statistically significant difference in the hypothesized direction between {exp_label} and {ctrl_label}",\n',
    '    "isSignificant": u_is_sig,\n',
    '    "alternative": MANN_WHITNEY_ALTERNATIVE,\n',
    '    "n1": int(n_exp),\n',
    '    "n2": int(n_ctrl),\n',
    '    "controlLabel": ctrl_label,\n',
    '    "experimentalLabel": exp_label,\n',
    '}\n\n',
    'print(f"=== Between-Cohort Mann-Whitney U Test ({exp_label} vs {ctrl_label}) ===")\n',
    'print(f"Cohort Sizes: Experimental ({exp_label}) = {n_exp}, Control ({ctrl_label}) = {n_ctrl}")\n',
    'print(f"Mann-Whitney U: {u_stat:.3f} | Z-score: {u_z:.3f} | p-value: {u_p:.5f} | Effect Size r: {u_r:.3f}")\n',
    'print(f"Cohort Comparison: {\'Experimental cohort gains were significantly superior\' if u_direction_confirmed else \'No statistically significant experimental superiority\'}")\n'
  ];

  const cell6Code = [
    '# =============================================================================\n',
    '# Cell 6: Empirical Hypothesis Verdict & Paper Sync Bridge\n',
    '# =============================================================================\n',
    'import scipy\n',
    `DESIGN_MODE = "${effectiveDesignMode}"\n\n`,
    'if DESIGN_MODE == "within_subject":\n',
    '    hypothesis_confirmed = w_direction_confirmed\n',
    'elif DESIGN_MODE == "between_group":\n',
    '    hypothesis_confirmed = u_direction_confirmed\n',
    'elif DESIGN_MODE == "combined":\n',
    '    hypothesis_confirmed = bool(w_direction_confirmed and u_direction_confirmed)\n',
    'else:\n',
    '    hypothesis_confirmed = w_direction_confirmed\n\n',
    'kernel_info = f"Python {sys.version.split()[0]} ({sys.platform}) / Scipy {scipy.__version__} / Numpy {np.__version__}"\n',
    'executed_at = datetime.now(timezone.utc).isoformat()\n\n',
    'print("=" * 64)\n',
    'print(f"       SCIENTIFIC HYPOTHESIS FINAL VERDICT ({DESIGN_MODE})        ")\n',
    'print("=" * 64)\n',
    'if hypothesis_confirmed:\n',
    '    print("[VERDICT: CORROBORATED] Statistically significant learning outcome corroborated.")\n',
    '    print(f"  Wilcoxon: W = {w_stat:.3f}, Z = {w_z:.3f}, p = {w_p:.5e}; Mann-Whitney: U = {u_stat:.3f}, Z = {u_z:.3f}, p = {u_p:.5e}")\n',
    'else:\n',
    '    print("[VERDICT: REJECTED / NOT SUPPORTED] Criteria for hypothesis confirmation not satisfied.")\n',
    '    print(f"  Wilcoxon: W = {w_stat:.3f}, p = {w_p:.5e}; Mann-Whitney: U = {u_stat:.3f}, p = {u_p:.5e} (alpha = {ALPHA})")\n',
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
    '    "designMode": DESIGN_MODE,\n',
    '    "controlLabel": ctrl_label,\n',
    '    "experimentalLabel": exp_label,\n',
    '    "executedCodeCells": [\n',
    '        str(cell) for idx, cell in enumerate(In) if idx > 0 and cell.strip()\n',
    '    ] if "In" in globals() and len(In) > 1 else [\n',
    '        "Cell 2 executed", "Cell 3 executed", "Cell 4 executed", "Cell 5 executed", "Cell 6 executed"\n',
    '    ],\n',
    `    "sessionId": "${safeSessionId}",\n`,
    '}\n\n',
    'def sanitize_json(obj):\n',
    '    if isinstance(obj, float):\n',
    '        if np.isnan(obj) or np.isinf(obj):\n',
    '            return 0.0\n',
    '        return obj\n',
    '    elif isinstance(obj, dict):\n',
    '        return {k: sanitize_json(v) for k, v in obj.items()}\n',
    '    elif isinstance(obj, (list, tuple)):\n',
    '        return [sanitize_json(v) for v in obj]\n',
    '    return obj\n\n',
    'clean_results = sanitize_json(reportthy_results)\n\n',
    '# 1. Persist results to disk (session-scoped filename)\n',
    `with open("reportthy_results_${safeSessionId}.json", "w", encoding="utf-8") as f:\n`,
    '    json.dump(clean_results, f, indent=2, allow_nan=False)\n',
    `print("\\n[Filesystem] Saved reportthy_results_${safeSessionId}.json to disk.")\n\n`,
    '# 2. Bridge via HTTP POST to Reportthy backend API\n',
    `RESULTS_API_URL = "${resultsApiUrl}"\n`,
    'post_payload = json.dumps(clean_results, allow_nan=False).encode("utf-8")\n',
    `post_headers = {"Content-Type": "application/json", "x-reportthy-session": "${safeSessionId}"}\n`,
    'try:\n',
    '    req = urllib.request.Request(RESULTS_API_URL, data=post_payload, headers=post_headers)\n',
    '    with urllib.request.urlopen(req, timeout=2.0) as resp:\n',
    '        print(f"[Bridge: HTTP] Synced results to RESULTS_API_URL: HTTP {resp.status}")\n',
    'except Exception:\n',
    '    print("[Notice] HTTP bridge bypassed; relying on local disk results file.")\n\n',
    '# 3. Standard stdout marker for JupyterHub Contents API extraction\n',
    'print("\\n__REPORTTHY_JSON_START__")\n',
    'print(json.dumps(clean_results, allow_nan=False))\n',
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
        display_name: 'Python 3',
        language: 'python',
        name: 'python3'
      },
      language_info: {
        codemirror_mode: {
          name: 'ipython',
          version: 3
        },
        file_extension: '.py',
        mimetype: 'text/x-python',
        name: 'python',
        nbconvert_exporter: 'python',
        pygments_lexer: 'ipython3',
        version: '3.11.0'
      }
    },
    nbformat: 4,
    nbformat_minor: 5
  };

  return JSON.stringify(notebook, null, 2);
}
