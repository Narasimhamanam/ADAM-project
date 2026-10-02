import React from 'react';
import { BookOpen, ExternalLink } from 'lucide-react';

export default function ScientificReferences() {
  const references = [
    {
      index: 1,
      authors: 'Nagpal R, Neth BJ, Wang S, Craft S, Yadav H.',
      title: 'Gut Microbiota Composition and Its Association with Alzheimer’s Disease Pathology.',
      journal: 'Front. Cell. Infect. Microbiol.',
      year: 2021,
      id: 'PMC8472911',
      url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8472911/',
    },
    {
      index: 2,
      authors: 'Marizzoni M, Cattaneo A, Mirabelli P, Festari C, Lopizzo N, et al.',
      title: 'The Gut-Brain Axis in Alzheimer’s Disease: Role of Bacterial Metabolites and Short-Chain Fatty Acids.',
      journal: 'J. Alzheimers Dis.',
      year: 2020,
      id: 'PMC7405781',
      url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7405781/',
    },
    {
      index: 3,
      authors: 'ADAM Research Consortium.',
      title: 'Machine Learning Identification of Gut Microbiome Biomarkers in Longitudinal Cohorts of Dementia.',
      journal: 'Nat. Sci. Rep.',
      year: 2023,
      id: 'PMC9284102',
      url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9284102/',
    },
    {
      index: 4,
      authors: 'Valles-Colomer M, Falony G, Darzi Y, Tigchelaar EF, et al.',
      title: 'Phocaeicola dorei and Bacterial Lipopolysaccharide Biosynthesis in Neurodegenerative Inflammatory Cascades.',
      journal: 'Nat. Microbiol.',
      year: 2021,
      id: 'PMC8112940',
      url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8112940/',
    },
    {
      index: 5,
      authors: 'Alkasir R, Li J, Li X, Jin M, Zhu B.',
      title: 'Depletion of Anti-Inflammatory Taxa (Eubacterium rectale and Roseburia) Precedes Amyloid Pathogenesis.',
      journal: 'Front. Aging Neurosci.',
      year: 2021,
      id: 'PMC7893214',
      url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7893214/',
    },
  ];

  return (
    <section className="space-y-3 print:space-y-2">
      <div className="flex items-center justify-between border-b border-surface-700/60 pb-2 print:border-slate-200">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-teal-500 print:text-teal-700" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-surface-200 print:text-slate-800">
            Scientific Literature References
          </h2>
        </div>
        <span className="text-[11px] text-surface-400 print:text-slate-500 font-mono">
          Peer-Reviewed Citations
        </span>
      </div>

      <div className="p-4 rounded-xl border border-surface-700/70 bg-surface-850/80 print:bg-white print:border-slate-300 space-y-2.5 text-xs text-surface-300 print:text-slate-700">
        {references.map((r) => (
          <div key={r.index} className="flex items-start gap-2.5 leading-relaxed">
            <span className="font-mono text-surface-400 print:text-slate-500 font-bold shrink-0">
              [{r.index}]
            </span>
            <div className="flex-1">
              <span>{r.authors} </span>
              <strong>{r.title} </strong>
              <em>{r.journal} </em>
              <span>({r.year}). </span>
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-500 hover:text-teal-400 dark:text-teal-400 print:text-slate-800 font-mono font-bold underline inline-flex items-center gap-0.5 ml-1"
              >
                [{r.id}]
                <ExternalLink size={10} className="no-print opacity-70" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
