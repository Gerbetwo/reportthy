'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  BookmarkCheck,
  Sparkles,
} from 'lucide-react';
import { useTranslation } from '@/lib/LanguageContext';
import { useDataset } from '@/lib/DatasetContext';
import {
  ExperimentalDesignMode,
  ResearcherAuthor,
  StudyMetadata,
} from '@/types/dataset';
import LocalCopilotPanel from '@/components/LocalCopilotPanel';

export default function StudyProtocolForm() {
  const { t } = useTranslation();
  const { studyMetadata, setStudyMetadata, updateCohortMapping } = useDataset();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showValidationSummary, setShowValidationSummary] = useState(false);

  // Validation rules
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    const leadAuthor = studyMetadata.authors?.[0];

    if (!leadAuthor || !leadAuthor.fullName?.trim()) {
      errors.push(t.protocol.validation.missingAuthor);
    } else if (
      leadAuthor.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadAuthor.email.trim())
    ) {
      errors.push(t.protocol.validation.invalidEmail);
    }

    if (!studyMetadata.studyTitle?.trim()) {
      errors.push(t.protocol.validation.missingTitle);
    }

    if (!studyMetadata.hypothesisStatement?.trim()) {
      errors.push(t.protocol.validation.missingHypothesis);
    }

    if (
      studyMetadata.designMode === 'between_group' ||
      studyMetadata.designMode === 'combined'
    ) {
      if (!studyMetadata.controlPedagogy?.trim()) {
        errors.push(t.protocol.validation.missingPedagogyControl);
      }
      if (!studyMetadata.experimentalPedagogy?.trim()) {
        errors.push(t.protocol.validation.missingPedagogyExp);
      }
    }

    return errors;
  }, [studyMetadata, t]);

  const isProtocolValid = validationErrors.length === 0;

  // Preset definitions (Quantum & Custom only)
  const applyPreset = (presetKey: 'quantum' | 'custom') => {
    if (presetKey === 'custom') {
      const customMeta: StudyMetadata = {
        studyTitle: '',
        topicDomain: '',
        controlPedagogy: '',
        experimentalPedagogy: '',
        hypothesisStatement: '',
        designMode: 'within_subject',
        alpha: 0.05,
        wilcoxonAlternative: 'greater',
        mannWhitneyAlternative: 'greater',
        authors: [
          {
            fullName: '',
            email: '',
            affiliation: '',
            country: '',
          },
        ],
        cohortMapping: {},
        aiNarrativeSlots: {},
      };
      setStudyMetadata(customMeta);
      updateCohortMapping({});
      return;
    }

    if (presetKey === 'quantum') {
      const mapping = {
        'Listado 1': 'Control' as const,
        'Listado 2': 'Experimental' as const,
        'Master Class': 'Control' as const,
        'IA Generativa': 'Experimental' as const,
      };
      setStudyMetadata((prev) => ({
        ...prev,
        studyTitle:
          'Generative AI Assisted Instruction in Introductory Quantum Computing Principles',
        topicDomain: 'Quantum Computing Principles & Superposition',
        controlPedagogy:
          'Traditional synchronous master class lectures and manual problem sets',
        experimentalPedagogy:
          'Interactive Jupyter notebooks coupled with generative AI concept visualizers and real-time state simulators',
        hypothesisStatement:
          'Participants receiving generative AI-assisted instruction demonstrate significant positive knowledge gain and outperform those receiving traditional master class instruction.',
        designMode: 'combined',
        alpha: 0.05,
        wilcoxonAlternative: 'greater',
        mannWhitneyAlternative: 'greater',
        authors: [
          {
            fullName: 'Dr. Edgar Eduardo Chaux Florez',
            email: 'echaux@university.edu',
            affiliation: 'Quantum Systems Research Group, Universidad Nacional',
            country: 'Colombia',
          },
        ],
        cohortMapping: mapping,
      }));
      updateCohortMapping(mapping);
      return;
    }
  };

  // Author Management
  const handleAuthorChange = (
    index: number,
    field: keyof ResearcherAuthor,
    value: string
  ) => {
    setStudyMetadata((prev) => {
      const updatedAuthors = [...prev.authors];
      if (!updatedAuthors[index]) {
        updatedAuthors[index] = {
          fullName: '',
          email: '',
          affiliation: '',
          country: '',
        };
      }
      updatedAuthors[index] = {
        ...updatedAuthors[index],
        [field]: value,
      };
      return { ...prev, authors: updatedAuthors };
    });
  };

  const addAuthor = () => {
    setStudyMetadata((prev) => ({
      ...prev,
      authors: [
        ...prev.authors,
        { fullName: '', email: '', affiliation: '', country: '' },
      ],
    }));
  };

  const removeAuthor = (index: number) => {
    if (studyMetadata.authors.length <= 1) return;
    setStudyMetadata((prev) => {
      const updated = prev.authors.filter((_, i) => i !== index);
      return { ...prev, authors: updated };
    });
  };

  return (
    <section className="bg-white border border-[#D0D7DE] rounded-lg shadow-xs mb-8 overflow-hidden transition-all">
      {/* Header bar with readiness badge and collapse toggle */}
      <div className="bg-[#FAFBFD] px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#002B49] text-white flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono font-bold text-slate-500">
                {t.protocol.step}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {t.protocol.fields.designModeOptions[studyMetadata.designMode]}
              </span>
            </div>
            <h2 className="font-serif font-bold text-base text-[#002B49] mt-0.5">
              {studyMetadata.studyTitle?.trim() || t.protocol.title}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-center">
          {/* Readiness pill */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold font-mono border transition ${
              isProtocolValid
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-slate-50 text-slate-700 border-slate-300'
            }`}
          >
            {isProtocolValid ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>
              {isProtocolValid
                ? t.protocol.protocolReadyBadge
                : t.protocol.optionalMetaBadge}
            </span>
          </div>

          {/* Collapsible toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1.5 text-xs font-semibold text-[#002B49] hover:text-white bg-[#F1F5F9] hover:bg-[#002B49] rounded-md border border-[#CBD5E1] transition flex items-center gap-1.5 shadow-2xs"
            aria-label={isExpanded ? t.protocol.toggleHide : t.protocol.configureProtocol}
          >
            <span>{isExpanded ? t.protocol.toggleHide : t.protocol.configureProtocol}</span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-6 space-y-6 border-t border-[#D0D7DE]">
          {/* Preset Selector Bar */}
          <div className="bg-[#F8F9FA] border border-[#E2E8F0] rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#002B49]">
              <Sparkles className="w-4 h-4 text-[#C0392B]" />
              <span>{t.protocol.loadPreset}:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => applyPreset('quantum')}
                className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-slate-100 text-[#002B49] border border-[#CBD5E1] rounded shadow-2xs transition flex items-center gap-1.5"
              >
                <BookmarkCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>{t.protocol.presets.quantum}</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('custom')}
                className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-[#CBD5E1] rounded shadow-2xs transition"
              >
                {t.protocol.presets.custom}
              </button>
              <button
                type="button"
                onClick={() => setShowValidationSummary(true)}
                className="ml-auto px-2.5 py-1 text-xs font-semibold bg-[#002B49] hover:bg-[#001A2C] text-white rounded transition shadow-2xs"
              >
                {t.protocol.validateProtocolBtn}
              </button>
            </div>
          </div>

          {/* Validation Warnings List (only shown on user request or explicit validation failure) */}
          {showValidationSummary && validationErrors.length > 0 && (
            <div className="bg-amber-50/80 border border-amber-300 rounded-lg p-3.5 text-xs text-amber-900 space-y-1 animate-in fade-in duration-150">
              <div className="font-semibold flex items-center gap-1.5 text-amber-800">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>{t.protocol.statusIncomplete}:</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-amber-800">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {showValidationSummary && isProtocolValid && (
            <div className="bg-emerald-50/80 border border-emerald-300 rounded-lg p-3 text-xs text-emerald-900 font-medium flex items-center gap-2 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{t.protocol.validationPassed}</span>
            </div>
          )}

          {/* Section 1: Lead Investigator & Co-Authors */}
          <div>
            <div className="flex items-center justify-between border-b border-[#EDF2F7] pb-2 mb-3">
              <h3 className="font-serif font-bold text-sm text-[#002B49]">
                {t.protocol.sections.authors}
              </h3>
              <button
                type="button"
                onClick={addAuthor}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#002B49] hover:text-[#001A2C] bg-[#F1F5F9] hover:bg-[#E2E8F0] px-2.5 py-1 rounded border border-[#CBD5E1] transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.protocol.authors.addAuthor}</span>
              </button>
            </div>

            <div className="space-y-3">
              {studyMetadata.authors.map((author, index) => (
                <div
                  key={index}
                  className="bg-[#FAFAFA] border border-[#E2E8F0] rounded-md p-3.5 text-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative"
                >
                  <div>
                    <label className="block text-[11px] font-semibold text-[#57606A] mb-1">
                      {t.protocol.authors.fullNameLabel}{' '}
                      {index > 0 && `#${index + 1}`} *
                    </label>
                    <input
                      type="text"
                      value={author.fullName}
                      onChange={(e) =>
                        handleAuthorChange(index, 'fullName', e.target.value)
                      }
                      placeholder={t.protocol.authors.fullNamePlaceholder}
                      className="w-full bg-white border border-[#D0D7DE] rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#002B49]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#57606A] mb-1">
                      {t.protocol.authors.emailLabel}
                    </label>
                    <input
                      type="email"
                      value={author.email}
                      onChange={(e) =>
                        handleAuthorChange(index, 'email', e.target.value)
                      }
                      placeholder={t.protocol.authors.emailPlaceholder}
                      className="w-full bg-white border border-[#D0D7DE] rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#002B49]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#57606A] mb-1">
                      {t.protocol.authors.affiliationLabel}
                    </label>
                    <input
                      type="text"
                      value={author.affiliation}
                      onChange={(e) =>
                        handleAuthorChange(index, 'affiliation', e.target.value)
                      }
                      placeholder={t.protocol.authors.affiliationPlaceholder}
                      className="w-full bg-white border border-[#D0D7DE] rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#002B49]"
                    />
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-[#57606A] mb-1">
                        {t.protocol.authors.countryLabel}
                      </label>
                      <input
                        type="text"
                        value={author.country}
                        onChange={(e) =>
                          handleAuthorChange(index, 'country', e.target.value)
                        }
                        placeholder={t.protocol.authors.countryPlaceholder}
                        className="w-full bg-white border border-[#D0D7DE] rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#002B49]"
                      />
                    </div>
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => removeAuthor(index)}
                        className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded border border-rose-200 transition"
                        title={t.protocol.authors.removeAuthor}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Study Parameters & Hypothesis */}
          <div>
            <div className="border-b border-[#EDF2F7] pb-2 mb-3">
              <h3 className="font-serif font-bold text-sm text-[#002B49]">
                {t.protocol.sections.studyDesign}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold text-[#57606A] mb-1">
                  {t.protocol.fields.studyTitleLabel} *
                </label>
                <input
                  type="text"
                  value={studyMetadata.studyTitle}
                  onChange={(e) =>
                    setStudyMetadata((prev) => ({
                      ...prev,
                      studyTitle: e.target.value,
                    }))
                  }
                  placeholder={t.protocol.fields.studyTitlePlaceholder}
                  className="w-full bg-white border border-[#D0D7DE] rounded px-3 py-2 text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#002B49]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#57606A] mb-1">
                  {t.protocol.fields.topicDomainLabel}
                </label>
                <input
                  type="text"
                  value={studyMetadata.topicDomain}
                  onChange={(e) =>
                    setStudyMetadata((prev) => ({
                      ...prev,
                      topicDomain: e.target.value,
                    }))
                  }
                  placeholder={t.protocol.fields.topicDomainPlaceholder}
                  className="w-full bg-white border border-[#D0D7DE] rounded px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#002B49]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#57606A] mb-1">
                  {t.protocol.fields.designModeLabel}
                </label>
                <select
                  value={studyMetadata.designMode}
                  onChange={(e) =>
                    setStudyMetadata((prev) => ({
                      ...prev,
                      designMode: e.target.value as ExperimentalDesignMode,
                    }))
                  }
                  className="w-full bg-white border border-[#D0D7DE] rounded px-3 py-2 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#002B49]"
                >
                  <option value="within_subject">
                    {t.protocol.fields.designModeOptions.within_subject}
                  </option>
                  <option value="between_group">
                    {t.protocol.fields.designModeOptions.between_group}
                  </option>
                  <option value="combined">
                    {t.protocol.fields.designModeOptions.combined}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#57606A] mb-1">
                  {t.protocol.fields.alphaLabel}
                </label>
                <select
                  value={studyMetadata.alpha}
                  onChange={(e) =>
                    setStudyMetadata((prev) => ({
                      ...prev,
                      alpha: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full bg-white border border-[#D0D7DE] rounded px-3 py-2 text-xs font-mono font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#002B49]"
                >
                  <option value={0.05}>
                    {t.protocol.fields.alphaOptions.alpha05}
                  </option>
                  <option value={0.01}>
                    {t.protocol.fields.alphaOptions.alpha01}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#57606A] mb-1">
                  {t.protocol.fields.wilcoxonAltLabel}
                </label>
                <select
                  value={studyMetadata.wilcoxonAlternative}
                  onChange={(e) =>
                    setStudyMetadata((prev) => {
                      const alternative = e.target.value as
                        | 'greater'
                        | 'less'
                        | 'two-sided';
                      return {
                        ...prev,
                        wilcoxonAlternative: alternative,
                        mannWhitneyAlternative: alternative,
                      };
                    })
                  }
                  className="w-full bg-white border border-[#D0D7DE] rounded px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#002B49]"
                >
                  <option value="greater">
                    {t.protocol.fields.altOptions.greater}
                  </option>
                  <option value="less">
                    {t.protocol.fields.altOptions.less}
                  </option>
                  <option value="two-sided">
                    {t.protocol.fields.altOptions.twoSided}
                  </option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold text-[#57606A] mb-1">
                  {t.protocol.fields.hypothesisLabel} *
                </label>
                <textarea
                  rows={2}
                  value={studyMetadata.hypothesisStatement}
                  onChange={(e) =>
                    setStudyMetadata((prev) => ({
                      ...prev,
                      hypothesisStatement: e.target.value,
                    }))
                  }
                  placeholder={t.protocol.fields.hypothesisPlaceholder}
                  className="w-full bg-white border border-[#D0D7DE] rounded px-3 py-2 text-xs font-serif text-slate-900 leading-relaxed focus:outline-hidden focus:ring-1 focus:ring-[#002B49]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Pedagogical Interventions */}
          <div>
            <div className="border-b border-[#EDF2F7] pb-2 mb-3">
              <h3 className="font-serif font-bold text-sm text-[#002B49]">
                {t.protocol.sections.pedagogy}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#57606A] mb-1">
                  {t.protocol.fields.controlPedagogyLabel}{' '}
                  {(studyMetadata.designMode === 'between_group' ||
                    studyMetadata.designMode === 'combined') &&
                    '*'}
                </label>
                <textarea
                  rows={2}
                  value={studyMetadata.controlPedagogy}
                  onChange={(e) =>
                    setStudyMetadata((prev) => ({
                      ...prev,
                      controlPedagogy: e.target.value,
                    }))
                  }
                  placeholder={t.protocol.fields.controlPedagogyPlaceholder}
                  className="w-full bg-white border border-[#D0D7DE] rounded px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#002B49]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#57606A] mb-1">
                  {t.protocol.fields.experimentalPedagogyLabel}{' '}
                  {(studyMetadata.designMode === 'between_group' ||
                    studyMetadata.designMode === 'combined') &&
                    '*'}
                </label>
                <textarea
                  rows={2}
                  value={studyMetadata.experimentalPedagogy}
                  onChange={(e) =>
                    setStudyMetadata((prev) => ({
                      ...prev,
                      experimentalPedagogy: e.target.value,
                    }))
                  }
                  placeholder={t.protocol.fields.experimentalPedagogyPlaceholder}
                  className="w-full bg-white border border-[#D0D7DE] rounded px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#002B49]"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Local AI Copilot (Opt-In) */}
          <LocalCopilotPanel
            mode="hypothesis"
            studyMetadata={studyMetadata}
            onApplyDesignMode={(mode) =>
              setStudyMetadata((prev) => ({
                ...prev,
                designMode: mode,
              }))
            }
            onApplyRefinedH1={(h1) =>
              setStudyMetadata((prev) => ({
                ...prev,
                hypothesisStatement: h1,
              }))
            }
          />
        </div>
      )}
    </section>
  );
}