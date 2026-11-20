"""Generate manuscript figures and tables exclusively from recorded artifacts."""
import hashlib
import json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

root = Path(__file__).resolve().parent
artifacts = root.parent / 'backend/app/research/artifacts'
source = artifacts / 'repeated_summary.json'
report = json.loads(source.read_text())
if report['config']['seeds'] < 30:
    raise ValueError('Manuscript requires at least 30 seeds')
figs = root / 'figures'; figs.mkdir(exist_ok=True)
methods = ['class_prior', 'always_both', 'full_forced', 'full_subject', 'full_mondrian',
           'compact_forced', 'compact_subject', 'compact_mondrian', 'clr_full_subject']
summary = report['summary']
lines = [r'\begin{table}', r'\caption{Subject-balanced results over 30 repeated five-fold partitions. Coverage intervals resample subjects, conditional on fitted predictions.}',
         r'\centering\small', r'\begin{tabular}{lrrr}', r'\toprule',
         r'Method & Subject coverage [95\% CI] & Singleton & AD coverage\\', r'\midrule']
md = ['| Method | Subject coverage (95% CI) | Singleton | AD coverage |', '|---|---:|---:|---:|']
for method in methods:
    s = summary[method]; c = s['covered']; lo, hi = c['ci95']
    cells = [f"{c['estimate']:.3f} [{lo:.3f}, {hi:.3f}]", f"{s['singleton']['estimate']:.3f}", f"{s['coverage_class_1']['estimate']:.3f}"]
    lines.append(method.replace('_', r'\_') + ' & ' + ' & '.join(cells) + r'\\')
    md.append('| ' + method + ' | ' + ' | '.join(cells) + ' |')
lines += [r'\bottomrule', r'\end{tabular}', r'\end{table}']
p = report['permutation']
lines.append(f"The unadjusted subject permutation test yielded AUROC {p['observed_subject_auc']:.3f} and $p={p['p_value']:.3f}$ over {p['n_permutations']} permutations.")
for mode, result in report['nested'].items():
    lines.append(f"Nested {mode} XGBoost subject AUROC was {result['subject_auc']:.3f} (one outer seed, five trials per fold).")
for name, delta in report['paired_coverage_deltas'].items():
    lo, hi = delta['ci95']
    lines.append(name.replace('_', r'\_') + f": coverage difference {delta['estimate']:.3f}, bootstrap interval [{lo:.3f}, {hi:.3f}].")
lines.append('Intervals and point estimates must be interpreted jointly with singleton acceptance; perfect coverage alone is achieved by the always-both baseline.')
stability_path = artifacts / 'heldout_stability.json'
stability = json.loads(stability_path.read_text())
folds = stability['folds']
scores = [fold['mean_jaccard'] for fold in folds]
lines.append(
    f"Across {len(folds)} held-out folds with {stability['training_bootstraps_per_fold']} "
    f"training-subject bootstrap refits each, mean pairwise Jaccard similarity of the "
    f"top {stability['top_k']} features was {np.mean(scores):.3f} "
    f"(fold range {min(scores):.3f} to {max(scores):.3f})."
)
(root / 'results.tex').write_text('\n'.join(lines)+'\n')
(root.parent / 'docs/REPEATED_RESULTS.md').write_text('# Executed repeated-fold results\n\n'+'\n'.join(md)+'\n\nConditional cluster-bootstrap intervals; not independent-cohort replication.\n')
x = np.arange(len(methods)); fig, ax = plt.subplots(figsize=(9, 5))
ax.barh(x-.18, [summary[m]['covered']['estimate'] for m in methods], .35, label='Subject coverage')
ax.barh(x+.18, [summary[m]['singleton']['estimate'] for m in methods], .35, label='Singleton acceptance')
ax.set_yticks(x, [m.replace('_', ' ') for m in methods]); ax.set_xlim(0, 1.05)
ax.axvline(.9, linestyle=':', color='gray', label='Nominal coverage')
ax.legend(loc='lower right'); ax.set_xlabel('Fraction'); fig.tight_layout()
fig.savefig(figs / 'coverage.pdf'); fig.savefig(figs / 'coverage.png', dpi=160); plt.close(fig)
fig, ax = plt.subplots(figsize=(7, 4))
for mode in ['full_subject', 'full_mondrian', 'compact_subject', 'compact_mondrian']:
    values = [v for v in report['risk_coverage'] if v['mode'].startswith(mode+'_a') and v['singleton_risk'] is not None]
    values.sort(key=lambda v: v['singleton_rate'])
    ax.plot([v['singleton_rate'] for v in values], [v['singleton_risk'] for v in values], 'o-', label=mode.replace('_', ' '))
ax.set_xlabel('Singleton acceptance'); ax.set_ylabel('Singleton error'); ax.legend(); ax.grid(alpha=.2); fig.tight_layout()
fig.savefig(figs / 'risk_coverage.pdf'); fig.savefig(figs / 'risk_coverage.png', dpi=160); plt.close(fig)
(root / 'artifact_hash.txt').write_text(hashlib.sha256(source.read_bytes()).hexdigest()+'  repeated_summary.json\n'+hashlib.sha256(stability_path.read_bytes()).hexdigest()+'  heldout_stability.json\n')
print('Generated tables and figures from', source)
