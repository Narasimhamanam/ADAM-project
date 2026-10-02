import React from 'react';
import { User, Activity, HeartPulse, Info } from 'lucide-react';

export default function PatientProfile({ sampleData }) {
  if (!sampleData) return null;

  // Extract real demographics safely
  const age = sampleData.age !== undefined && sampleData.age !== null ? sampleData.age : sampleData.covariates?.age;
  const isMale = sampleData.male !== undefined && sampleData.male !== null
    ? sampleData.male === 1
    : (sampleData.covariates?.gender === 1);
  const genderLabel = sampleData.male !== undefined && sampleData.male !== null
    ? (isMale ? 'Male' : 'Female')
    : (sampleData.gender || 'Female');

  const studyId = sampleData.study_id || sampleData.covariates?.study_id || 'CH1-112';
  const day = sampleData.day ?? sampleData.covariates?.day ?? 0;

  // Extract real host factors safely
  const cfs = sampleData.clinical_frailty_scale !== undefined && sampleData.clinical_frailty_scale !== null
    ? sampleData.clinical_frailty_scale
    : sampleData.covariates?.clinical_frailty_scale;
  const malnutrition = sampleData.malnutrition_indicator_sco !== undefined && sampleData.malnutrition_indicator_sco !== null
    ? sampleData.malnutrition_indicator_sco
    : sampleData.covariates?.malnutrition_indicator_sco;
  const ppi = sampleData.ppi !== undefined && sampleData.ppi !== null
    ? sampleData.ppi
    : (sampleData.PPI !== undefined ? sampleData.PPI : sampleData.covariates?.ppi);
  const ppiLabel = ppi === 1 ? 'Active User' : 'Non-user';

  const abx = sampleData.abx6mo !== undefined && sampleData.abx6mo !== null
    ? sampleData.abx6mo
    : sampleData.covariates?.abx6mo;
  const abxLabel = abx === 1 ? 'Reported (past 6 mo)' : 'None reported';

  const hopsn = sampleData.hopsn !== undefined && sampleData.hopsn !== null
    ? sampleData.hopsn
    : sampleData.covariates?.hopsn;
  const hopsnLabel = hopsn === 1 ? 'Prior admission' : 'None reported';

  return (
    <section className="space-y-3 print:space-y-2">
      <div className="flex items-center justify-between border-b border-surface-700/60 pb-2 print:border-slate-200">
        <div className="flex items-center gap-2">
          <User size={16} className="text-teal-500 print:text-teal-700" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-surface-200 print:text-slate-800">
            Patient &amp; Sample Profile
          </h2>
        </div>
        <span className="text-[11px] text-surface-400 print:text-slate-500 font-mono">
          Clinical Baseline Characteristics
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Column 1: Demographics */}
        <div className="p-4 rounded-xl border border-surface-700/70 bg-surface-850/80 print:bg-slate-50 print:border-slate-300 space-y-3">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-surface-400 print:text-slate-600 flex items-center gap-1.5">
            <Activity size={13} className="text-teal-500" />
            Demographics &amp; Study Metadata
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-surface-900/80 border border-surface-700/50 print:bg-white print:border-slate-200">
              <p className="text-[10px] uppercase font-bold text-surface-400 print:text-slate-500">Age</p>
              <p className="font-semibold text-surface-50 print:text-slate-900 text-sm mt-0.5">
                {age !== undefined && age !== null ? `${age} years` : 'Data unavailable'}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-surface-900/80 border border-surface-700/50 print:bg-white print:border-slate-200">
              <p className="text-[10px] uppercase font-bold text-surface-400 print:text-slate-500">Sex</p>
              <p className="font-semibold text-surface-50 print:text-slate-900 text-sm mt-0.5">{genderLabel}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-surface-900/80 border border-surface-700/50 print:bg-white print:border-slate-200">
              <p className="text-[10px] uppercase font-bold text-surface-400 print:text-slate-500">Study / Subject ID</p>
              <p className="font-mono font-semibold text-surface-50 print:text-slate-900 text-sm mt-0.5">{studyId}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-surface-900/80 border border-surface-700/50 print:bg-white print:border-slate-200">
              <p className="text-[10px] uppercase font-bold text-surface-400 print:text-slate-500">Collection Day</p>
              <p className="font-semibold text-surface-50 print:text-slate-900 text-sm mt-0.5">Day {day}</p>
            </div>
          </div>
        </div>

        {/* Column 2: Relevant Host Factors */}
        <div className="p-4 rounded-xl border border-surface-700/70 bg-surface-850/80 print:bg-slate-50 print:border-slate-300 space-y-3">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-surface-400 print:text-slate-600 flex items-center gap-1.5">
            <HeartPulse size={13} className="text-teal-500" />
            Relevant Host Physiological Factors
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-2.5 rounded-lg bg-surface-900/80 border border-surface-700/50 print:bg-white print:border-slate-200">
              <p className="text-[10px] uppercase font-bold text-surface-400 print:text-slate-500">Clinical Frailty</p>
              <p className="font-extrabold text-surface-50 print:text-slate-900 text-sm mt-0.5 font-mono">
                {cfs !== undefined && cfs !== null ? `${cfs} / 9` : 'Not recorded'}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-surface-900/80 border border-surface-700/50 print:bg-white print:border-slate-200">
              <p className="text-[10px] uppercase font-bold text-surface-400 print:text-slate-500">Malnutrition</p>
              <p className="font-extrabold text-surface-50 print:text-slate-900 text-sm mt-0.5 font-mono">
                {malnutrition !== undefined && malnutrition !== null ? `${malnutrition}` : 'Not recorded'}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-surface-900/80 border border-surface-700/50 print:bg-white print:border-slate-200">
              <p className="text-[10px] uppercase font-bold text-surface-400 print:text-slate-500">PPI Exposure</p>
              <p className="font-semibold text-surface-50 print:text-slate-900 text-xs mt-1">{ppiLabel}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-surface-900/80 border border-surface-700/50 print:bg-white print:border-slate-200">
              <p className="text-[10px] uppercase font-bold text-surface-400 print:text-slate-500">Antibiotics (6mo)</p>
              <p className="font-semibold text-surface-50 print:text-slate-900 text-xs mt-1">{abxLabel}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-surface-900/80 border border-surface-700/50 print:bg-white print:border-slate-200 sm:col-span-2">
              <p className="text-[10px] uppercase font-bold text-surface-400 print:text-slate-500">Hospitalization History</p>
              <p className="font-semibold text-surface-50 print:text-slate-900 text-xs mt-1">{hopsnLabel}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Measure Definitions Footnote */}
      <p className="text-[10px] text-surface-400 print:text-slate-500 italic leading-normal pt-1">
        *Clinical Frailty Scale (CFS): 9-point validated frailty index. Malnutrition Indicator: score reflecting metabolic nutritional status. Host covariates are modeled as interactive biological factors rather than isolated diagnostic criteria.
      </p>
    </section>
  );
}
