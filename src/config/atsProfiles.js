export const atsProfiles = {
  cornerstone: {
    displayName: 'Cornerstone',
    weights: {
      skillMatch: 0.4,
      skillFrequency: 0.15,
      context: 0.15,
      keywordMatch: 0.1,
      formatting: 0.1,
      experienceRelevance: 0.1
    },
    expectations: {
      keywordMode: 'normalized',
      minKeywordCoverage: 0.7,
      minSkillCoverage: 0.8,
      requiredSections: ['skills', 'experience', 'education'],
      sectionBoosts: { skills: 1.1, experience: 1.05 },
      contextRules: {
        requireSkillInExperience: true,
        contextWindowChars: 140
      },
      formatRules: {
        disallowTables: true,
        disallowTwoColumn: false,
        maxBulletChar: 200,
        preferredFileTypes: ['pdf', 'docx', 'txt']
      }
    },
    synonyms: {
      'aspen hysys': 'hysys',
      'gas dehydration unit': 'gas dehydration'
    }
  },
  workday: {
    displayName: 'Workday',
    weights: {
      skillMatch: 0.35,
      skillFrequency: 0.2,
      context: 0.1,
      keywordMatch: 0.15,
      formatting: 0.1,
      experienceRelevance: 0.1
    },
    expectations: {
      keywordMode: 'normalized',
      minKeywordCoverage: 0.8,
      minSkillCoverage: 0.7,
      requiredSections: ['skills', 'experience'],
      sectionBoosts: { experience: 1.1 },
      contextRules: {
        requireSkillInExperience: false,
        contextWindowChars: 100
      },
      formatRules: {
        disallowTables: false,
        disallowTwoColumn: true,
        maxBulletChar: 150,
        preferredFileTypes: ['pdf', 'docx']
      }
    },
    synonyms: {
      // add as needed
    }
  },
  taleo: {
    displayName: 'Taleo',
    weights: {
      skillMatch: 0.3,
      skillFrequency: 0.1,
      context: 0.1,
      keywordMatch: 0.3,
      formatting: 0.1,
      experienceRelevance: 0.1
    },
    expectations: {
      keywordMode: 'exact',
      minKeywordCoverage: 0.9,
      minSkillCoverage: 0.6,
      requiredSections: ['experience'],
      sectionBoosts: {},
      contextRules: {
        requireSkillInExperience: false,
        contextWindowChars: 80
      },
      formatRules: {
        disallowTables: false,
        disallowTwoColumn: false,
        maxBulletChar: 100,
        preferredFileTypes: ['txt', 'docx']
      }
    },
    synonyms: {
      // add as needed
    }
  }
}

export const supportedAts = Object.keys(atsProfiles)