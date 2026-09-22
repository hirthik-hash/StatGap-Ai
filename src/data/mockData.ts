import { User, Competency, Misconception, MicroLearningStep, QuizQuestion, IGotCourse, StudyDocument } from '../types';

export const DEMO_USER: User = {
  name: 'Ananya Sharma',
  iGotId: 'IGOT202600123',
  email: 'ananya.sharma@gov.in',
  phone: '9876543210',
  dob: '1992-08-14',
  department: 'Official Statistics Division',
  designation: 'Statistical Officer',
  yearsOfExperience: 6,
  profilePhoto: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=256&auto=format&fit=crop',
};

export const INITIAL_COMPETENCIES: Competency[] = [
  {
    id: 'comp_stat_analysis',
    name: 'Statistical Analysis',
    category: 'Core Methodology',
    score: 82,
    requiredScore: 75,
    gapPoints: 0,
    status: 'competent',
    description: 'Inferential statistics, parametric testing, hypothesis formulation and ANOVA within official datasets.',
    evidence: {
      assessmentScore: 85,
      quizAccuracy: 80,
      practicalPerformance: 81,
      assessmentRatio: '1/6 incorrect',
      repeatedErrors: 0,
      confidencePattern: 'Calibrated: High confidence + correct',
    },
    decay: {
      current: 82,
      days30: 80,
      days90: 77,
      status: 'Fresh',
      lastEvaluatedDaysAgo: 12,
      projectedHalfLifeDays: 140,
    },
    verification: {
      learningCompleted: true,
      assessmentPassed: true,
      practiceCompleted: true,
      practicalEvidenceVerified: true,
      verifiedAt: '2026-07-15',
    },
  },
  {
    id: 'comp_survey_method',
    name: 'Survey Methodology',
    category: 'Field Operations',
    score: 76,
    requiredScore: 75,
    gapPoints: 0,
    status: 'competent',
    description: 'Stratified multi-stage sampling, sampling frame verification, non-response weighting in NSS & PLFS.',
    evidence: {
      assessmentScore: 78,
      quizAccuracy: 75,
      practicalPerformance: 75,
      assessmentRatio: '2/8 incorrect',
      repeatedErrors: 1,
      confidencePattern: 'Moderate confidence + mostly correct',
    },
    decay: {
      current: 76,
      days30: 74,
      days90: 70,
      status: 'Fresh',
      lastEvaluatedDaysAgo: 18,
      projectedHalfLifeDays: 120,
    },
    verification: {
      learningCompleted: true,
      assessmentPassed: true,
      practiceCompleted: true,
      practicalEvidenceVerified: true,
      verifiedAt: '2026-08-01',
    },
  },
  {
    id: 'comp_regression',
    name: 'Regression',
    category: 'Econometrics & Modeling',
    score: 61,
    requiredScore: 75,
    gapPoints: 14,
    status: 'moderate_gap',
    description: 'OLS estimation, multivariate regression interpretation, residual diagnostics, and elasticity calculations.',
    evidence: {
      assessmentScore: 62,
      quizAccuracy: 58,
      practicalPerformance: 62,
      assessmentRatio: '4/6 incorrect',
      repeatedErrors: 3,
      confidencePattern: 'High confidence + incorrect',
    },
    misconceptionId: 'misc_regression_coeff',
    misconceptionTitle: 'Regression Coefficient Misinterpretation',
    misconceptionExplanation:
      'The officer may be interpreting regression coefficients as direct percentage changes rather than understanding them as the expected change in the dependent variable associated with a one-unit change in the predictor, holding other variables constant.',
    decay: {
      current: 84,
      days30: 79,
      days90: 71,
      status: 'Refresh Recommended',
      lastEvaluatedDaysAgo: 45,
      projectedHalfLifeDays: 65,
    },
    verification: {
      learningCompleted: true,
      assessmentPassed: true,
      practiceCompleted: true,
      practicalEvidenceVerified: false, // Pending!
    },
  },
  {
    id: 'comp_data_viz',
    name: 'Data Visualization',
    category: 'Dissemination',
    score: 72,
    requiredScore: 75,
    gapPoints: 3,
    status: 'moderate_gap',
    description: 'Official statistical dashboards, choropleth maps, MoSPI graphical guidelines, and distribution plotting.',
    evidence: {
      assessmentScore: 70,
      quizAccuracy: 74,
      practicalPerformance: 72,
      assessmentRatio: '2/6 incorrect',
      repeatedErrors: 1,
      confidencePattern: 'Medium confidence + inconsistent errors',
    },
    misconceptionId: 'misc_sampling_bias',
    misconceptionTitle: 'Axis Scaling & Proportionality Misunderstanding',
    misconceptionExplanation: 'Truncating axes improperly or misrepresenting standard errors visually across state-level benchmarks.',
    decay: {
      current: 72,
      days30: 70,
      days90: 66,
      status: 'Fresh',
      lastEvaluatedDaysAgo: 24,
      projectedHalfLifeDays: 90,
    },
    verification: {
      learningCompleted: true,
      assessmentPassed: true,
      practiceCompleted: false,
      practicalEvidenceVerified: false,
    },
  },
  {
    id: 'comp_python',
    name: 'Python',
    category: 'Computational Tools',
    score: 45,
    requiredScore: 75,
    gapPoints: 30,
    status: 'critical_gap',
    description: 'Pandas vectorized manipulations, NumPy arrays, handling large administrative microdata, clean scripting.',
    evidence: {
      assessmentScore: 40,
      quizAccuracy: 48,
      practicalPerformance: 46,
      assessmentRatio: '7/10 incorrect',
      repeatedErrors: 5,
      confidencePattern: 'Low confidence + frequent timeouts',
    },
    misconceptionId: 'misc_python_mutation',
    misconceptionTitle: 'Vectorized Memory vs Loop Mutation Confusion',
    misconceptionExplanation: 'Applying iterative Python loops over multi-million row Census/PLFS blocks instead of vectorized Boolean masks.',
    decay: {
      current: 45,
      days30: 42,
      days90: 36,
      status: 'Critical Decay Alert',
      lastEvaluatedDaysAgo: 60,
      projectedHalfLifeDays: 45,
    },
    verification: {
      learningCompleted: false,
      assessmentPassed: false,
      practiceCompleted: false,
      practicalEvidenceVerified: false,
    },
  },
  {
    id: 'comp_ai_ml',
    name: 'AI/ML',
    category: 'Advanced Analytics',
    score: 38,
    requiredScore: 75,
    gapPoints: 37,
    status: 'critical_gap',
    description: 'Machine learning for statistical imputation, outlier detection, LLM prompt engineering for metadata tagging.',
    evidence: {
      assessmentScore: 35,
      quizAccuracy: 40,
      practicalPerformance: 39,
      assessmentRatio: '8/10 incorrect',
      repeatedErrors: 4,
      confidencePattern: 'High confidence + false assumption errors',
    },
    misconceptionId: 'misc_correlation_causation',
    misconceptionTitle: 'Supervised Model Prediction vs Causal Inference',
    misconceptionExplanation: 'Treating high predictive R² or feature importance in tree models as proof of causal public policy levers.',
    decay: {
      current: 38,
      days30: 34,
      days90: 28,
      status: 'Critical Decay Alert',
      lastEvaluatedDaysAgo: 75,
      projectedHalfLifeDays: 40,
    },
    verification: {
      learningCompleted: false,
      assessmentPassed: false,
      practiceCompleted: false,
      practicalEvidenceVerified: false,
    },
  },
  {
    id: 'comp_official_stats',
    name: 'Official Statistics',
    category: 'Institutional Framework',
    score: 88,
    requiredScore: 75,
    gapPoints: 0,
    status: 'competent',
    description: 'Collection of Statistics Act 2008, National Statistical Commission mandates, UN Fundamental Principles of Official Statistics.',
    evidence: {
      assessmentScore: 90,
      quizAccuracy: 88,
      practicalPerformance: 86,
      assessmentRatio: '1/10 incorrect',
      repeatedErrors: 0,
      confidencePattern: 'Calibrated: High confidence + highly accurate',
    },
    decay: {
      current: 88,
      days30: 86,
      days90: 84,
      status: 'Fresh',
      lastEvaluatedDaysAgo: 8,
      projectedHalfLifeDays: 200,
    },
    verification: {
      learningCompleted: true,
      assessmentPassed: true,
      practiceCompleted: true,
      practicalEvidenceVerified: true,
      verifiedAt: '2026-06-20',
    },
  },
];

export const MISCONCEPTIONS_LIBRARY: Misconception[] = [
  {
    id: 'misc_regression_coeff',
    name: 'Regression Coefficient Misinterpretation',
    category: 'Econometrics & Modeling',
    shortDesc: 'Learner interprets coefficients as direct percentage changes without considering units and model structure.',
    detailedExplanation:
      'In a linear regression model Y = β₀ + β₁X + ε, the coefficient β₁ represents the expected absolute change in the dependent variable (in Y units) for every one-unit increase in the predictor X, holding all other covariates constant. Officers frequently confuse this with an elasticity or a percentage change (%ΔY / %ΔX), which is only true in log-log models.',
    detectionRule:
      'IF accuracy < 60% AND repeatedErrors >= 2 AND confidence = "High" AND selectedOption = "Percentage change directly" THEN flag regression coefficient misinterpretation.',
    confidenceLevel: 'High',
    evidenceStrength: 'Strong',
    statisticalContext: 'Crucial for interpreting socio-economic indicators in PLFS and Consumer Expenditure surveys.',
    counterExample:
      'If wage (in ₹ thousands) is regressed on schooling (years) with β₁ = 2.5, it means an extra year of school increases wages by ₹2,500, NOT by 2.5%!',
    remediationSnippet:
      'Always inspect the measurement scale of both Y and X. A linear model measures absolute rate of change (dy/dx); only logarithmic transformations represent percentage changes.',
  },
  {
    id: 'misc_confidence_interval',
    name: 'Confidence Interval Misconception',
    category: 'Inferential Statistics',
    shortDesc: 'Learner interprets a confidence interval as containing a fixed probability that the parameter lies inside the interval.',
    detailedExplanation:
      'Frequentist confidence intervals describe the long-run coverage probability of repeated sampling, not the probability that a specific realized interval contains the true fixed population parameter. The parameter is either in the interval or not (probability is 0 or 1).',
    detectionRule:
      'IF question.type == "ConfidenceInterval" AND optionSelected == "95% probability the true mean is between A and B" THEN flag Confidence Interval Frequentist Fallacy.',
    confidenceLevel: 'Very High',
    evidenceStrength: 'Strong',
    statisticalContext: 'Vital when presenting National Sample Survey estimates to policy makers.',
    counterExample:
      'Saying "There is a 95% chance the actual national unemployment rate is between 4.2% and 5.8%" is incorrect. The 95% refers to the procedure: in 95 out of 100 repeated random samples, the calculated intervals will cover the fixed parameter.',
    remediationSnippet:
      'Frame confidence intervals in terms of the sampling distribution and estimator reliability rather than assigning Bayesian posterior probabilities to fixed unknown constants.',
  },
  {
    id: 'misc_p_value',
    name: 'P-value Misconception',
    category: 'Hypothesis Testing',
    shortDesc: 'Learner interprets the p-value as the probability that the null hypothesis is true.',
    detailedExplanation:
      'A p-value is P(Data as extreme or more extreme | H₀ is true). It does NOT measure P(H₀ | Data). A small p-value indicates that the observed data is rare under the assumption that the null is correct; it does not compute the probability that the null is correct or that the alternative is true.',
    detectionRule:
      'IF question.type == "HypothesisTest" AND optionSelected == "Probability that null hypothesis is true" THEN flag P-value Inversion Misconception.',
    confidenceLevel: 'High',
    evidenceStrength: 'Strong',
    statisticalContext: 'Prevents misleading statistical significance reporting in economic research bulletins.',
    counterExample:
      'p = 0.03 does not mean there is a 3% chance the null hypothesis is true. It means if the null were true, we would see data this extreme only 3% of the time.',
    remediationSnippet:
      'Remember conditional probability direction: p-value is P(Evidence | Innocence), not P(Innocence | Evidence).',
  },
  {
    id: 'misc_sampling_bias',
    name: 'Sampling Bias Misconception',
    category: 'Survey Methodology',
    shortDesc: 'Learner assumes a large sample automatically eliminates selection bias.',
    detailedExplanation:
      'A large sample size (N) reduces random sampling variance (standard error), but has zero effect on systematic bias. If the sampling frame or survey delivery method systematically excludes informal workers, collecting 1,000,000 responses will simply produce a very precise, highly biased estimate.',
    detectionRule:
      'IF accuracy < 60% AND answerText.includes("large sample guarantees representativeness") THEN flag Big Data Fallacy / Sampling Bias Neglect.',
    confidenceLevel: 'High',
    evidenceStrength: 'Strong',
    statisticalContext: 'Critical when evaluating digital web surveys versus door-to-door stratified field enumerations.',
    counterExample:
      'The 1936 Literary Digest poll surveyed 2.4 million people and incorrectly predicted Landon would defeat Roosevelt, because its sample was heavily biased towards wealthier phone/car owners.',
    remediationSnippet:
      'Precision is not accuracy. Sample size shrinks variance; proper probability sampling and weighting cure bias.',
  },
  {
    id: 'misc_correlation_causation',
    name: 'Correlation vs Causation Misconception',
    category: 'Analytical Reasoning',
    shortDesc: 'Learner assumes strong correlation implies causation.',
    detailedExplanation:
      'Observing a statistically significant correlation coefficient between two macro-economic variables does not imply that manipulating one will alter the other. Endogeneity, omitted variable bias, and reverse causality frequently create spurious associations in observational data.',
    detectionRule:
      'IF question.type == "Causality" AND optionSelected == "X causes Y because r = 0.89" THEN flag Spurious Causality Assumption.',
    confidenceLevel: 'Medium',
    evidenceStrength: 'Moderate',
    statisticalContext: 'Protects state statistical ministries from making flawed policy recommendations from raw time-series correlations.',
    counterExample:
      'Ice cream sales and drowning rates are strongly positively correlated. The omitted confounding variable is summer temperature.',
    remediationSnippet:
      'Causal claims require randomized controlled trials (RCTs), instrumental variables, difference-in-differences, or structural econometric identification.',
  },
];

export const REGRESSION_MICROLEARNING_STEPS: MicroLearningStep[] = [
  {
    stepNumber: 1,
    title: 'Concept: Marginal Rate of Change vs. Percentage Elasticity',
    type: 'concept',
    duration: '5 min',
    subtitle: 'Understanding the Mathematical Mechanics of OLS Coefficients',
    content: `In a standard linear regression equation:

**Y = β₀ + β₁X + ε**

Where:
• **Y** is the dependent variable (e.g., Monthly Household Expenditure in ₹)
• **X** is the independent variable (e.g., Household Size in persons)
• **β₁** is the regression slope coefficient

### The Exact Definition
β₁ represents the **absolute expected change in Y (in units of Y)** associated with a **one-unit increase in X (in units of X)**, holding all other variables constant (*ceteris paribus*).

### Common Officer Trap
Many officers instinctively state: *"X increased by 1, so Y changes by β₁ percent."*
**This is incorrect!**
A percentage interpretation is ONLY valid if the model is specified in logarithms:
• **Linear-Linear (Y on X):** ΔY = β₁ · ΔX (Absolute units)
• **Log-Linear (ln Y on X):** %ΔY ≈ (100 · β₁) · ΔX (Semi-elasticity)
• **Log-Log (ln Y on ln X):** %ΔY ≈ β₁ · %ΔX (True elasticity)`,
    keyTakeaway: 'In a linear model without logs, β₁ is an absolute unit change (dy/dx), NEVER a percentage change.',
  },
  {
    stepNumber: 2,
    title: 'Worked Example: PLFS Wage Regression Analysis',
    type: 'worked_example',
    duration: '4 min',
    subtitle: 'Real-World Case Study from Periodic Labour Force Survey Microdata',
    content: `Consider an official econometric analysis evaluating wage determinants for urban youth:

\`\`\`text
Monthly_Wage_INR = 12,500 + 1,850 · Education_Years + 620 · Experience_Years
\`\`\`

### Given Model Statistics:
• **Dependent Variable (Y):** Monthly Wage in Indian Rupees (₹)
• **Education_Years (X₁):** Years of formal schooling (0 to 18)
• **β₁ Coefficient:** +1,850

---

### Comparison of Explanations:

❌ **Incorrect (Misconception Response):**
*"Each additional year of education increases the officer's monthly wage by 1,850% or by 18.5%."*
*(Erroneous mental conversion to percentages)*

✅ **Correct (Official Statistical Rigor):**
*"Each additional year of completed education is associated with an expected increase of ₹1,850 in monthly wage, holding years of experience constant."*

### What if we want percentage change?
To evaluate percentage increase, we must divide by baseline average wage or estimate a log-wage model: \`ln(Monthly_Wage) = 9.4 + 0.082 · Education_Years\`, which indicates an ~8.2% return per year of schooling.`,
    keyTakeaway: 'Always specify the exact physical or monetary units: ₹1,850 per year of schooling, NOT 1,850%.',
  },
  {
    stepNumber: 3,
    title: 'Interactive Practice: District Wheat Production Model',
    type: 'practice',
    duration: '4 min',
    subtitle: 'Apply Your Understanding on an Agricultural Statistics Model',
    content: `An agricultural statistician models district wheat production across 75 districts in Uttar Pradesh:

\`\`\`text
Yield_Quintals = 24.5 + 3.2 · Fertilizer_KgPerHectare + 0.8 · Irrigation_Days
\`\`\`

Where Yield is measured in **Quintals per Hectare**, and Fertilizer is measured in **Kg per Hectare**.

Answer the practice question below to test your interpretation:`,
    keyTakeaway: 'Check both axes units before phrasing your analytical conclusion.',
    interactiveQuestion: {
      question: 'How should the coefficient β₁ = 3.2 be correctly reported in the official state agricultural bulletin?',
      options: [
        'A 1 kg/ha increase in fertilizer is associated with a 3.2% increase in wheat yield.',
        'A 1 kg/ha increase in fertilizer is associated with an expected increase of 3.2 quintals/ha in wheat yield, holding irrigation days constant.',
        'A 100% increase in fertilizer usage doubles wheat yield by 3.2 times.',
        'Wheat yield increases by 32 quintals whenever fertilizer increases by 10%.',
      ],
      correctIndex: 1,
      explanation: 'Excellent! Option B correctly identifies the absolute unit change (3.2 quintals/ha for every 1 kg/ha increment) with the ceteris paribus condition.',
    },
  },
  {
    stepNumber: 4,
    title: 'Quick Verification: Log-Transformed Elasticity Check',
    type: 'verification',
    duration: '2 min',
    subtitle: 'Rapid Competency Checkpoint Before Adaptive Assessment',
    content: `Now test whether you can recognize the distinction when a logarithmic model is deliberately introduced:

\`\`\`text
ln(Household_Expenditure) = 4.12 + 0.65 · ln(Household_Income) + ε
\`\`\`

Here both variables have been transformed using natural logarithms.`,
    keyTakeaway: 'Log-Log model coefficients represent constant elasticity (% change per 1% change).',
    interactiveQuestion: {
      question: 'In this log-log model, how should the coefficient β = 0.65 be interpreted?',
      options: [
        'A ₹1 increase in income leads to a ₹0.65 increase in expenditure.',
        'A 1% increase in household income is associated with an estimated 0.65% increase in household expenditure.',
        'Expenditure increases by ₹65 for every ₹100 of income.',
        'Household income increases by 65% when expenditure increases by 1 unit.',
      ],
      correctIndex: 1,
      explanation: 'Spot on! In a double-log (log-log) model, the coefficient is an elasticity: d(ln Y)/d(ln X) = (dY/Y)/(dX/X) = 0.65%. You have mastered the distinction!',
    },
  },
];

export const ADAPTIVE_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q_reg_easy_1',
    competencyId: 'comp_regression',
    difficulty: 'easy',
    scenario: 'NSSO Household Consumer Expenditure Survey (HCES)',
    question: 'In the simple linear regression Y = 50 + 4.5X, what does the coefficient 4.5 represent?',
    options: [
      'The expected percentage change in Y for a 1% change in X.',
      'The expected absolute change in Y for a one-unit change in X.',
      'The probability that X causes Y.',
      'The correlation coefficient between X and Y multiplied by 100.',
    ],
    correctIndex: 1,
    explanation: 'In a linear equation Y = β₀ + β₁X, β₁ (4.5) denotes the expected change in Y for a 1-unit change in X.',
    trapOptionIndex: 0,
    trapMisconceptionId: 'misc_regression_coeff',
    trapMisconceptionName: 'Regression Coefficient Misinterpretation',
  },
  {
    id: 'q_reg_med_1',
    competencyId: 'comp_regression',
    difficulty: 'medium',
    scenario: 'Ministry of Statistics Energy Consumption Index',
    question: 'A regression model estimates: Energy_Units = 120 + 0.75 · Factory_Output_Tons. An officer reports: "A 10-ton increase in output increases energy consumption by 7.5%." Is this report accurate?',
    options: [
      'Yes, because 0.75 corresponds to 75% per 100 units, so 10 units = 7.5%.',
      'No. It increases energy consumption by 7.5 units, not 7.5 percent.',
      'Yes, because regression coefficients always represent percentage changes in industrial indices.',
      'No. The intercept 120 must be added to 7.5% first.',
    ],
    correctIndex: 1,
    explanation: '0.75 · 10 tons = 7.5 Energy_Units (absolute units), not a percentage. Confusing absolute increments with percentages is a frequent statistical reporting error.',
    trapOptionIndex: 0,
    trapMisconceptionId: 'misc_regression_coeff',
    trapMisconceptionName: 'Regression Coefficient Misinterpretation',
  },
  {
    id: 'q_reg_hard_1',
    competencyId: 'comp_regression',
    difficulty: 'hard',
    scenario: 'PLFS Quarterly Microdata Evaluation',
    question: 'Given the multivariate model: Wage = 15000 + 450 · Age + 1200 · Technical_Certificate + ε, where Technical_Certificate is a binary dummy variable (1 = Yes, 0 = No). What does 1200 indicate?',
    options: [
      'Holding age constant, having a technical certificate is associated with an expected ₹1,200 higher wage.',
      'Holding age constant, having a technical certificate increases wage by 12% on average.',
      'The certificate causes a 1,200% return on vocational training investment.',
      'Workers with technical certificates represent 12% of the surveyed sample.',
    ],
    correctIndex: 0,
    explanation: 'In a dummy variable model, the coefficient on the binary indicator is the difference in the expected level of Y between the two groups (₹1,200), keeping other covariates fixed.',
    trapOptionIndex: 1,
    trapMisconceptionId: 'misc_regression_coeff',
    trapMisconceptionName: 'Regression Coefficient Misinterpretation',
  },
  {
    id: 'q_reg_hard_2',
    competencyId: 'comp_regression',
    difficulty: 'hard',
    scenario: 'State Macroeconomic Price Deflator',
    question: 'If the estimated equation is ln(State_GSDP) = 8.2 + 0.42 · ln(Capital_Investment), how should 0.42 be interpreted?',
    options: [
      'Every ₹1 crore increase in capital investment increases GSDP by ₹0.42 crore.',
      'A 1% increase in capital investment is associated with an expected 0.42% increase in State GSDP.',
      'GSDP increases by 42% for each additional unit of capital.',
      'Capital investment explains 42% of the variance in State GSDP (R² = 0.42).',
    ],
    correctIndex: 1,
    explanation: 'In a double natural-log model (log-log), the slope coefficient directly estimates the constant elasticity (%ΔY / %ΔX).',
    trapOptionIndex: 2,
    trapMisconceptionId: 'misc_regression_coeff',
    trapMisconceptionName: 'Regression Coefficient Misinterpretation',
  },
];

export const IGOT_COMPLETED_COURSES: IGotCourse[] = [
  {
    id: 'igot_c1',
    title: 'Introduction to Official Statistics',
    provider: 'National Statistical Systems Training Academy (NSSTA)',
    completedDate: '14 May 2026',
    hours: 18,
    certificateId: 'iGOT-NSSTA-2026-8831',
    competencyMapped: 'Official Statistics',
  },
  {
    id: 'igot_c2',
    title: 'PLFS Fundamentals',
    provider: 'Ministry of Statistics and Programme Implementation (MoSPI)',
    completedDate: '28 June 2026',
    hours: 24,
    certificateId: 'iGOT-MOSPI-2026-9142',
    competencyMapped: 'Survey Methodology',
  },
  {
    id: 'igot_c3',
    title: 'Survey Methodology',
    provider: 'Indian Statistical Institute (ISI Kolkata & iGOT)',
    completedDate: '19 July 2026',
    hours: 30,
    certificateId: 'iGOT-ISI-2026-1049',
    competencyMapped: 'Statistical Analysis',
  },
];

export const STUDY_DOCUMENTS: StudyDocument[] = [
  {
    id: 'doc_plfs_manual',
    fileName: 'PLFS_Instruction_Manual_Vol_I.pdf',
    fileSize: '4.8 MB',
    uploadedDate: '2026-08-20',
    status: 'Ready',
    extractedSections: 42,
    generatedQuestions: [
      {
        question: 'Under PLFS guidelines, what defines Current Weekly Status (CWS) activity of a surveyed person?',
        sourceExcerpt: 'Section 3.4.1: Activity status determined on the basis of a reference period of 7 days preceding the date of survey.',
        page: 18,
        isSourceGrounded: true,
        requiresHumanReview: false,
      },
      {
        question: 'What is the sampling weight multiplier for second stage stratum in rural sampling units?',
        sourceExcerpt: 'Formula 4.2: Inverse probability of selection based on Census 2011 enumeration blocks.',
        page: 34,
        isSourceGrounded: true,
        requiresHumanReview: false,
      },
      {
        question: 'Will artificial intelligence models replace household visits by field investigators by 2028?',
        sourceExcerpt: 'Source document does not contain speculative projections on future automated field replacements.',
        page: 0,
        isSourceGrounded: false,
        requiresHumanReview: true, // Responsible AI flagged!
      },
    ],
  },
  {
    id: 'doc_regression_primer',
    fileName: 'MoSPI_Econometric_Methodology_Note.pdf',
    fileSize: '2.1 MB',
    uploadedDate: '2026-09-01',
    status: 'Ready',
    extractedSections: 19,
    generatedQuestions: [
      {
        question: 'What is the distinction between marginal unit change and elasticity in consumption models?',
        sourceExcerpt: 'Page 12, Paragraph 3: Unstandardized coefficients in linear specifications indicate absolute response per unit covariate change.',
        page: 12,
        isSourceGrounded: true,
        requiresHumanReview: false,
      },
      {
        question: 'Should survey weights be incorporated into OLS variance-covariance matrix calculations?',
        sourceExcerpt: 'Page 27: Weighted least squares with sandwich robust estimators are mandated for complex survey designs.',
        page: 27,
        isSourceGrounded: true,
        requiresHumanReview: false,
      },
    ],
  },
];
