import React from 'react';
import { Layers, AlertCircle, Info } from 'lucide-react';
import ResponsiveTable from '../ui/ResponsiveTable';

function formatTaxonAbundance(val) {
  if (val !== undefined && val !== null && !isNaN(Number(val))) {
    const num = Number(val);
    return `${(num * 100).toFixed(4)}%`;
  }
  return 'Data unavailable for this sample';
}

export default function MicrobiomeProfile({ sampleData }) {
  const taxaList = [
    {
      name: 'Phocaeicola dorei',
      rawVal: sampleData?.secondary_covariates?.['Phocaeicola dorei'] ?? sampleData?.covariates?.['Phocaeicola dorei'],
      role: 'Pro-inflammatory association',
      direction: 'Contextual risk association',
      evidenceStatus: 'Literature-supported',
      context: 'Synthesizes immunogenic hexa-acylated LPS; reported in literature to associate with TLR4 microglial activation and systemic endotoxemia.',
    },
    {
      name: 'Neglecta timonensis',
      rawVal: sampleData?.secondary_covariates?.['Neglecta timonensis'] ?? sampleData?.covariates?.['Neglecta timonensis'],
      role: 'Pro-inflammatory association',
      direction: 'Contextual risk association',
      evidenceStatus: 'Literature-supported',
      context: 'Observed in clinical dementia cohorts to positively correlate with circulating inflammatory cytokines and mucosal permeability.',
    },
    {
      name: 'Eubacterium rectale',
      rawVal: sampleData?.secondary_covariates?.['Eubacterium rectale'] ?? sampleData?.covariates?.['Eubacterium rectale'],
      role: 'Neuroprotective SCFA producer',
      direction: 'Protective / Commensal',
      evidenceStatus: 'Literature-supported',
      context: 'Ferments dietary fiber into butyrate; supports intestinal tight junctions and maintains blood-brain barrier integrity.',
    },
    {
      name: 'Faecalibacterium prausnitzii',
      rawVal: sampleData?.secondary_covariates?.['Faecalibacterium prausnitzii'] ?? sampleData?.covariates?.['Faecalibacterium prausnitzii'],
      role: 'Anti-inflammatory commensal',
      direction: 'Protective / Commensal',
      evidenceStatus: 'Literature-supported',
      context: 'Produces anti-inflammatory metabolites (MAM protein); frequently observed depleted in neurodegenerative dysbiotic states.',
    },
  ];

  return (
    <section className="space-y-3 print:space-y-2">
      <div className="flex items-center justify-between border-b border-surface-700/60 pb-2 print:border-slate-200">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-teal-500 print:text-teal-700" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-surface-200 print:text-slate-800">
            Microbiome Profile (Species Relative Abundances)
          </h2>
        </div>
        <span className="text-[11px] text-surface-400 print:text-slate-500 font-mono">
          Key Metagenomic Taxa
        </span>
      </div>

      <ResponsiveTable>
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-surface-800/80 border-b border-surface-700/80 text-surface-300 print:bg-slate-100 print:text-slate-800 print:border-slate-300">
              <th className="p-3 print:p-2 font-bold">Taxon</th>
              <th className="p-3 print:p-2 font-bold">Observed Abundance</th>
              <th className="p-3 print:p-2 font-bold">Functional / Literature Association</th>
              <th className="p-3 print:p-2 font-bold">Scientific Context</th>
              <th className="p-3 print:p-2 font-bold">Evidence Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700/60 bg-surface-850/40 print:bg-white print:divide-slate-200">
            {taxaList.map((t, idx) => (
              <tr key={idx}>
                <td className="p-3 print:p-2 font-bold text-surface-50 print:text-slate-900 italic font-sans whitespace-nowrap">
                  {t.name}
                </td>
                <td className="p-3 print:p-2 font-mono text-[11px] text-surface-300 print:text-slate-700 font-medium">
                  {formatTaxonAbundance(t.rawVal)}
                </td>
                <td className="p-3 print:p-2 text-[11px]">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                    t.direction.includes('risk')
                      ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 print:bg-amber-50 print:text-amber-800'
                      : 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 print:bg-teal-50 print:text-teal-800'
                  }`}>
                    {t.role}
                  </span>
                </td>
                <td className="p-3 print:p-2 text-surface-300 print:text-slate-600 text-[11px] leading-relaxed max-w-xs">
                  {t.context}
                </td>
                <td className="p-3 print:p-2 text-[11px] font-mono text-surface-400 print:text-slate-600">
                  <span className="px-2 py-0.5 rounded bg-surface-800 border border-surface-700/50 print:bg-slate-100 print:border-slate-200 text-[10px]">
                    {t.evidenceStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ResponsiveTable>

      {/* Prominent Interpretation Note Caveat */}
      <div className="p-3 rounded-lg bg-surface-850/80 border border-surface-700/60 print:bg-slate-50 print:border-slate-300 text-xs text-surface-300 print:text-slate-700 leading-relaxed">
        <p className="font-bold text-[10px] uppercase tracking-wider text-teal-600 dark:text-teal-400 print:text-teal-800 mb-0.5">
          INTERPRETATION NOTE
        </p>
        <p className="text-[11px]">
          Microbial taxa are reported as associations within the multi-omic evidence framework and should not be interpreted as independent mono-causal drivers of Alzheimer's disease.
        </p>
      </div>
    </section>
  );
}
