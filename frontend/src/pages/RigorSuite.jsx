/**
 * RigorSuite.jsx — Leakage-aware evaluation, calibration, conformal uncertainty
 * and SHAP-stability results, rendered from the reproducible backend artifact
 * (python -m app.research.rigor). Nothing on this page is computed in the browser.
 */
import React, { useEffect, useState } from 'react'
import { Scale, ShieldAlert, Target, Layers, Shuffle, Info } from 'lucide-react'
import { fetchRigorReport } from '../api/client'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorAlert from '../components/ui/ErrorAlert'
import StatCard from '../components/ui/StatCard'

const f = (v, d = 3) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(d) : '—')
const ms = (s, d = 3) => (s ? `${f(s.mean, d)} ± ${f(s.sd, d)}` : '—')

function Section({ icon: Icon, title, note, children }) {
  return (
    <section className="card-raised p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Icon size={18} className="text-accent-400" />
        <h2 className="text-base font-semibold text-surface-50">{title}</h2>
      </div>
      {note && <p className="text-xs text-surface-400 flex gap-1.5"><Info size={13} className="shrink-0 mt-0.5" />{note}</p>}
      <div className="overflow-x-auto">{children}</div>
    </section>
  )
}

function Table({ head, rows }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-surface-400 text-xs uppercase tracking-wide">
          {head.map((h) => <th key={h} className="py-2 pr-4 font-medium">{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-surface-700/40 text-surface-100">
            {r.map((c, j) => <td key={j} className="py-2 pr-4 font-data">{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function RigorSuite() {
  const [report, setReport] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    setError(null)
    fetchRigorReport()
      .then(setReport)
      .catch((e) => setError(e?.response?.data?.detail || e.message || 'Failed to load rigor report'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  if (loading) return <LoadingSpinner fullPage message="Loading rigor report…" />
  if (error) return <ErrorAlert message={error} onRetry={load} />

  const { provenance: pv, leakage_audit: la, feature_group_ablation: fa, calibration: cal, conformal: cf, shap_stability: ss } = report
  const xgb = la.models.xgboost
  const lr = la.models.logisticregression

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-2"><Scale size={22} /> Rigor Suite</h1>
        <p className="text-sm text-surface-400 mt-1">
          {pv.n_samples} samples · {pv.n_subjects} subjects · {pv.n_features} features. Internal cohort metrics and external transfer results are labeled separately.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ShieldAlert} label="XGBoost AUROC inflation from leakage" value={`+${f(xgb.auroc_inflation_from_leakage.mean)}`}
          sub={`${f(xgb.auroc_sample_level_cv.mean)} naive → ${f(xgb.auroc_subject_grouped_cv.mean)} grouped`} accent="danger" />
        <StatCard icon={ShieldAlert} label="Logistic regression inflation" value={`+${f(lr.auroc_inflation_from_leakage.mean)}`}
          sub={`${f(lr.auroc_sample_level_cv.mean)} naive → ${f(lr.auroc_subject_grouped_cv.mean)} grouped`} accent="warning" />
        <StatCard icon={Target} label="Conformal coverage (empirical)" value={f(cf.empirical_coverage.mean)}
          sub={`target ${f(cf.config.target_coverage, 2)} · ${cf.config.n_repeats_used} repeats`} accent="success" />
        <StatCard icon={Shuffle} label="SHAP top-k Jaccard stability" value={f(ss.pairwise_jaccard_top_k.mean, 2)}
          sub={`k=${ss.config.top_k}, ${ss.config.n_boot_used} subject-bootstraps`} accent="primary" />
      </div>

      {report.alzbiom && <Section icon={Scale} title="External evaluation on AlzBiom"
        note={`Exploratory genus-only comparison on ${report.alzbiom.external_records} records. Both models trained on ADAM. Lower Brier scores indicate better probability predictions.`}>
        <Table head={['Model', 'AUROC', 'Brier score']} rows={[
          ['Original genus model (C = 1)', f(report.alzbiom.auc), f(report.alzbiom.brier, 5)],
          [`ADAM cross-validated penalty (C = ${report.alzbiom.tuned_C})`, f(report.alzbiom.tuned_auc), f(report.alzbiom.tuned_brier, 5)],
          ['ADAM prevalence', '0.500', f(report.alzbiom.source_prior_brier, 5)],
          ['AlzBiom prevalence (retrospective)', '0.500', f(report.alzbiom.oracle_brier, 5)],
        ]} />
        <p>Original AUROC 95% interval with source refitting: {report.alzbiom.refit_auc_ci95.map(v => f(v)).join(' to ')}. {report.validation_status?.species_clinical || 'Validation status unavailable.'}</p>
      </Section>}
      <Section icon={ShieldAlert} title="1. Subject-level leakage audit"
        note="The Alzheimer's label is constant within a subject, so sample-level CV places the same person in train and test folds.">
        <Table
          head={['Model', 'AUROC sample-level CV', 'AUROC subject-grouped CV', 'Inflation', 'Subjects shared train/test (per fold)']}
          rows={Object.entries(la.models).map(([m, v]) => [
            m, ms(v.auroc_sample_level_cv), ms(v.auroc_subject_grouped_cv), ms(v.auroc_inflation_from_leakage),
            `${v.mean_subjects_shared_between_train_and_test_per_fold.sample_level_cv} vs ${v.mean_subjects_shared_between_train_and_test_per_fold.subject_grouped_cv}`,
          ])} />
      </Section>

      <Section icon={Layers} title="2. Feature-group ablation (subject-grouped CV, XGBoost)"
        note={`Proxy columns tested: ${fa.config.proxy_columns.join(', ')}.`}>
        <Table head={['Feature set', '# features', 'AUROC']}
          rows={Object.entries(fa.settings).map(([k, v]) => [k, v.n_features, ms(v.auroc_subject_grouped_cv)])} />
      </Section>

      <Section icon={Target} title="3. Calibration (subject-grouped out-of-fold)"
        note="Platt scaling is fit on held-out calibration subjects inside each training fold, never on test subjects.">
        <Table head={['Probabilities', 'AUROC', 'Brier', 'Log loss', 'ECE (10 bins)']}
          rows={[['raw', 'raw_probabilities'], ['Platt-scaled', 'platt_scaled_on_held_out_subjects']].map(([label, key]) => [
            label, ms(cal[key].auroc), ms(cal[key].brier), ms(cal[key].log_loss), ms(cal[key].ece_10bin),
          ])} />
      </Section>

      <Section icon={Target} title="4. Subject-level split-conformal prediction"
        note={cf.caveat}>
        <Table head={['Metric', 'Value']}
          rows={[
            ['Target coverage', f(cf.config.target_coverage, 2)],
            ['Empirical coverage', ms(cf.empirical_coverage)],
            ['Coverage | control', ms(cf.coverage_given_true_class.control)],
            ['Coverage | Alzheimer\'s', ms(cf.coverage_given_true_class.alzheimers)],
            ['Mean set size', ms(cf.mean_prediction_set_size)],
            ['Fraction singleton sets', ms(cf.fraction_singleton_sets)],
            ['Fraction both-label (abstain)', ms(cf.fraction_both_labels_abstain)],
          ]} />
      </Section>

      <Section icon={Shuffle} title="5. SHAP explanation stability (bootstrap over subjects)"
        note={`Pairwise Jaccard@${ss.config.top_k}: ${ms(ss.pairwise_jaccard_top_k)} · Spearman (all features): ${ms(ss.pairwise_spearman_all_features)}`}>
        <Table head={['Feature', 'Selected in top-k', 'Mean |SHAP|']}
          rows={ss.consensus_top_features.slice(0, 12).map((x) => [
            x.feature, `${Math.round(x.selection_frequency * 100)}%`, f(x.mean_abs_shap, 4),
          ])} />
      </Section>

      {report.repeated && <Section icon={Scale} title="6. Paired repeated subject folds"
        note={`${report.repeated.config.seeds} seeds; 95% intervals resample subjects retaining all repeats. Conditional on fitted predictions; not external validation.`}>
        <Table head={['Method', 'All-visit subject coverage [95% CI]', 'Singleton acceptance', 'Coverage | AD']}
          rows={Object.entries(report.repeated.summary).map(([name, s]) => [
            name, `${f(s.covered.estimate)} [${s.covered.ci95.map(v => f(v)).join(', ')}]`,
            f(s.singleton.estimate), f(s.coverage_class_1.estimate),
          ])} />
        <p className="text-xs text-surface-400">Compare full and compact with the same calibration. Always-both sets achieve perfect coverage while making no single-label decisions.</p>
      </Section>}
      <p className="text-xs text-surface-500">
        Reproduce: <code>cd backend &amp;&amp; python -m app.research.rigor</code> · design-matrix SHA-256 {pv.design_matrix_sha256.slice(0, 16)}…
      </p>
    </div>
  )
}
