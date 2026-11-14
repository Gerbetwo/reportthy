import { describe, it, expect } from 'vitest';
import { en } from '@/locales/en';
import { es } from '@/locales/es';
import { StudyMetadata, ExperimentalDesignMode, CohortRole } from '@/types/dataset';
import { extractUniqueGroups, inferDefaultCohortRole } from '@/lib/csvCleaner';

describe('Study Protocol & Cohort Mapper Logic (Task Part 2/4)', () => {
  it('has identical, symmetrically matching translation keys between en and es for protocol', () => {
    const enKeys = Object.keys(en.protocol).sort();
    const esKeys = Object.keys(es.protocol).sort();
    expect(enKeys).toEqual(esKeys);

    // Check nested keys
    expect(Object.keys(en.protocol.presets).sort()).toEqual(
      Object.keys(es.protocol.presets).sort()
    );
    expect(Object.keys(en.protocol.authors).sort()).toEqual(
      Object.keys(es.protocol.authors).sort()
    );
    expect(Object.keys(en.protocol.fields).sort()).toEqual(
      Object.keys(es.protocol.fields).sort()
    );
    expect(Object.keys(en.protocol.validation).sort()).toEqual(
      Object.keys(es.protocol.validation).sort()
    );
    expect(Object.keys(en.protocol.cohortMapper).sort()).toEqual(
      Object.keys(es.protocol.cohortMapper).sort()
    );
    expect(Object.keys(en.protocol.cohortMapper.roles).sort()).toEqual(
      Object.keys(es.protocol.cohortMapper.roles).sort()
    );
  });

  it('validates protocol completeness based on experimental design mode', () => {
    const validateProtocol = (meta: Partial<StudyMetadata>): string[] => {
      const errors: string[] = [];
      const leadAuthor = meta.authors?.[0];

      if (!leadAuthor || !leadAuthor.fullName?.trim()) {
        errors.push('missingAuthor');
      } else if (
        leadAuthor.email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadAuthor.email.trim())
      ) {
        errors.push('invalidEmail');
      }

      if (!meta.studyTitle?.trim()) {
        errors.push('missingTitle');
      }

      if (!meta.hypothesisStatement?.trim()) {
        errors.push('missingHypothesis');
      }

      if (meta.designMode === 'between_group' || meta.designMode === 'combined') {
        if (!meta.controlPedagogy?.trim()) {
          errors.push('missingPedagogyControl');
        }
        if (!meta.experimentalPedagogy?.trim()) {
          errors.push('missingPedagogyExp');
        }
      }

      return errors;
    };

    // Incomplete within-subject
    expect(validateProtocol({ designMode: 'within_subject' })).toEqual([
      'missingAuthor',
      'missingTitle',
      'missingHypothesis',
    ]);

    // Invalid email
    expect(
      validateProtocol({
        authors: [{ fullName: 'Dr. Jane', email: 'not-an-email', affiliation: '', country: '' }],
        studyTitle: 'Title',
        hypothesisStatement: 'Hypothesis',
        designMode: 'within_subject',
      })
    ).toEqual(['invalidEmail']);

    // Complete within-subject without pedagogy
    expect(
      validateProtocol({
        authors: [{ fullName: 'Dr. Jane', email: 'jane@uni.edu', affiliation: '', country: '' }],
        studyTitle: 'Title',
        hypothesisStatement: 'Hypothesis',
        designMode: 'within_subject',
      })
    ).toEqual([]);

    // Incomplete between_group without pedagogies
    expect(
      validateProtocol({
        authors: [{ fullName: 'Dr. Jane', email: 'jane@uni.edu', affiliation: '', country: '' }],
        studyTitle: 'Title',
        hypothesisStatement: 'Hypothesis',
        designMode: 'between_group',
      })
    ).toEqual(['missingPedagogyControl', 'missingPedagogyExp']);

    // Complete between_group with pedagogies
    expect(
      validateProtocol({
        authors: [{ fullName: 'Dr. Jane', email: 'jane@uni.edu', affiliation: '', country: '' }],
        studyTitle: 'Title',
        hypothesisStatement: 'Hypothesis',
        controlPedagogy: 'PDF Guide',
        experimentalPedagogy: 'Gamified CLI',
        designMode: 'between_group',
      })
    ).toEqual([]);
  });

  it('determines when between-group or combined testing has missing cohorts', () => {
    const checkMissingCohortWarning = (
      designMode: ExperimentalDesignMode,
      cohortRoleCounts: { control: number; experimental: number }
    ): boolean => {
      const isBetweenOrCombined =
        designMode === 'between_group' || designMode === 'combined';
      return (
        isBetweenOrCombined &&
        (cohortRoleCounts.control === 0 || cohortRoleCounts.experimental === 0)
      );
    };

    // Within-subject never triggers missing cohort warning
    expect(
      checkMissingCohortWarning('within_subject', { control: 10, experimental: 0 })
    ).toBe(false);

    // Between-group with 0 control triggers warning
    expect(
      checkMissingCohortWarning('between_group', { control: 0, experimental: 10 })
    ).toBe(true);

    // Combined with 0 experimental triggers warning
    expect(
      checkMissingCohortWarning('combined', { control: 15, experimental: 0 })
    ).toBe(true);

    // Both groups present: no warning
    expect(
      checkMissingCohortWarning('between_group', { control: 12, experimental: 14 })
    ).toBe(false);
  });

  it('allows dynamic updating of cohort mapping and respects inferred defaults', () => {
    const rawGroups = ['Guía PDF', 'Gamificación', 'Taller Adicional'];
    const initialMapping: Record<string, CohortRole> = {
      'Guía PDF': inferDefaultCohortRole('Guía PDF'),
      'Gamificación': inferDefaultCohortRole('Gamificación'),
      'Taller Adicional': inferDefaultCohortRole('Taller Adicional'),
    };

    expect(initialMapping['Guía PDF']).toBe('Control');
    expect(initialMapping['Gamificación']).toBe('Experimental');
    expect(initialMapping['Taller Adicional']).toBe('Unassigned');

    // Override by researcher
    const updatedMapping: Record<string, CohortRole> = {
      ...initialMapping,
      'Taller Adicional': 'Control',
    };

    expect(updatedMapping['Taller Adicional']).toBe('Control');
  });
});
