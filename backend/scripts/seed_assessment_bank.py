"""Seed Question Bank for STAT-GAP AI Adaptive Assessment Prototype.

Provides 32 calibrated statistical questions across 4 question types:
- single_concept (8 foundational items, b in [-2.5, -0.5])
- misconception_probe (8 cognitive distortion probes, b in [-0.8, +1.2])
- application (8 official survey/data analysis scenarios, b in [-0.2, +1.8])
- integrated_concept (8 multi-concept relationship synthesis items, b in [+0.5, +2.5])

Linked with KnowledgeGraph concept nodes, relationships, and misconception IDs.
"""
import os
import sys
import json
from sqlalchemy.orm import Session

# Ensure workspace root is in sys.path
workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if workspace_root not in sys.path:
    sys.path.insert(0, workspace_root)

from dotenv import load_dotenv
load_dotenv(os.path.join(workspace_root, ".env"))
load_dotenv(os.path.join(workspace_root, "backend", ".env"))

from backend.app.core.database import SessionLocal
from backend.app.models.assessment_item import (
    AssessmentItem,
    AssessmentItemConcept,
    AssessmentItemRelationship,
)
from backend.app.models.competency import Competency
from backend.app.models.knowledge_graph import CompetencyNode, CompetencyRelationship
from backend.app.models.misconception import Misconception


SEED_ASSESSMENT_ITEMS = [
    # =========================================================================
    # 1. SINGLE CONCEPT (Foundational, b in [-2.5, -0.5])
    # =========================================================================
    {
        "id": "item_sc_variance_01",
        "competency_id": "comp_stat_analysis",
        "question_type": "single_concept",
        "stem": "In descriptive statistics, what does the sample variance s² measure?",
        "options": [
            "The average distance of observations from the median",
            "The sum of squared deviations from the sample mean divided by degrees of freedom (n - 1)",
            "The difference between the maximum and minimum sample values",
            "The probability of observing extreme survey values by chance alone",
        ],
        "correct_answer": 1,
        "explanation": "Sample variance s² is defined as the sum of squared deviations from the mean divided by (n - 1), providing an unbiased estimator of population variance σ².",
        "difficulty_b": -2.2,
        "cognitive_level": "recall",
        "concepts": [("concept_variance", "primary")],
    },
    {
        "id": "item_sc_std_error_01",
        "competency_id": "comp_stat_analysis",
        "question_type": "single_concept",
        "stem": "How is the standard error of the sample mean (SE) mathematically defined for a simple random sample of size n drawn from a population with standard deviation σ?",
        "options": [
            "SE = σ * sqrt(n)",
            "SE = σ / sqrt(n)",
            "SE = σ² / n",
            "SE = sqrt(σ) / n",
        ],
        "correct_answer": 1,
        "explanation": "The standard error of the sample mean is σ / sqrt(n), reflecting the standard deviation of the sampling distribution of the mean.",
        "difficulty_b": -1.8,
        "cognitive_level": "comprehension",
        "concepts": [("concept_std_error", "primary")],
    },
    {
        "id": "item_sc_sampling_dist_01",
        "competency_id": "comp_stat_analysis",
        "question_type": "single_concept",
        "stem": "According to the Central Limit Theorem (CLT), under standard regularity conditions, what happens to the sampling distribution of the sample mean as sample size n becomes large?",
        "options": [
            "It becomes uniform regardless of the population distribution",
            "It approaches a normal distribution regardless of the underlying population shape",
            "It collapses into a single deterministic spike at the sample median",
            "Its variance increases proportionally to the sample size",
        ],
        "correct_answer": 1,
        "explanation": "The Central Limit Theorem establishes that the distribution of standardized sample sums/means converges to standard normal N(0, 1) as n increases, provided finite population variance.",
        "difficulty_b": -1.4,
        "cognitive_level": "comprehension",
        "concepts": [("concept_sampling_dist", "primary")],
    },
    {
        "id": "item_sc_ols_spec_01",
        "competency_id": "comp_stat_analysis",
        "question_type": "single_concept",
        "stem": "Under the Gauss-Markov theorem, what optimal property do Ordinary Least Squares (OLS) estimators possess if the classical error assumptions hold?",
        "options": [
            "They are Biased Linear Upper Estimators",
            "They are Best Linear Unbiased Estimators (BLUE), achieving minimum variance among linear unbiased estimators",
            "They guarantee zero residual error for every sample observation",
            "They eliminate all non-sampling errors and survey frame defects",
        ],
        "correct_answer": 1,
        "explanation": "The Gauss-Markov theorem proves OLS is BLUE: Best Linear Unbiased Estimator (minimum variance within the class of linear unbiased estimators).",
        "difficulty_b": -1.1,
        "cognitive_level": "recall",
        "concepts": [("concept_regression", "primary")],
    },
    {
        "id": "item_sc_null_hyp_01",
        "competency_id": "comp_stat_analysis",
        "question_type": "single_concept",
        "stem": "In formal statistical hypothesis testing, what is the definition of a Type I error?",
        "options": [
            "Failing to reject the null hypothesis when the alternative hypothesis is true",
            "Rejecting the null hypothesis when the null hypothesis is actually true",
            "Selecting a sample that is smaller than the target sample quota",
            "Calculating a test statistic using incorrect sample weights",
        ],
        "correct_answer": 1,
        "explanation": "A Type I error (false positive) occurs when the test rejects a true null hypothesis H₀. The probability of this error is bounded by significance level α.",
        "difficulty_b": -1.5,
        "cognitive_level": "recall",
        "concepts": [("concept_hyp_testing", "primary")],
    },
    {
        "id": "item_sc_p_value_def_01",
        "competency_id": "comp_stat_analysis",
        "question_type": "single_concept",
        "stem": "Which statement correctly defines a frequentist p-value in hypothesis testing?",
        "options": [
            "The posterior probability that the null hypothesis is true given the sample data",
            "The probability of observing a test statistic at least as extreme as the sample value, assuming H₀ is true",
            "The probability that the research hypothesis will replicate in future survey rounds",
            "The percentage difference between the sample estimate and the true parameter",
        ],
        "correct_answer": 1,
        "explanation": "The p-value is P(T >= t_obs | H₀), the probability under the null hypothesis of obtaining data at least as contradictory to H₀ as what was observed.",
        "difficulty_b": -0.9,
        "cognitive_level": "comprehension",
        "concepts": [("concept_p_value", "primary")],
    },
    {
        "id": "item_sc_sampling_frame_01",
        "competency_id": "comp_stat_analysis",
        "question_type": "single_concept",
        "stem": "In official survey design (NSS/CSO), what constitutes a 'sampling frame'?",
        "options": [
            "The mathematical equation used to estimate strata weights",
            "The comprehensive list or mapping of all target population units available for selection",
            "The physical questionnaire administered by field investigators",
            "The software environment used to tabulate microdata results",
        ],
        "correct_answer": 1,
        "explanation": "A sampling frame is the actual operational listing, directory, or cartographic map from which sample units are selected.",
        "difficulty_b": -2.0,
        "cognitive_level": "recall",
        "concepts": [("concept_sampling", "primary")],
    },
    {
        "id": "item_sc_ci_coverage_01",
        "competency_id": "comp_stat_analysis",
        "question_type": "single_concept",
        "stem": "In frequentist estimation, what is the meaning of a '95% confidence level' for an interval estimator?",
        "options": [
            "Each single calculated interval contains 95% of the population observations",
            "Across hypothetical infinite repeated independent samples, 95% of generated intervals will capture the fixed true parameter",
            "The population mean fluctuates within the interval 95% of the calendar year",
            "There is a 5% measurement error in the field survey administration",
        ],
        "correct_answer": 1,
        "explanation": "Frequentist confidence describes the long-run coverage performance of the estimation procedure across repeated draws, not a posterior probability for a single interval.",
        "difficulty_b": -0.6,
        "cognitive_level": "comprehension",
        "concepts": [("concept_conf_interval", "primary")],
    },

    # =========================================================================
    # 2. MISCONCEPTION PROBES (Cognitive distortion probes, b in [-0.8, +1.2])
    # =========================================================================
    {
        "id": "item_mp_pvalue_prob_01",
        "competency_id": "comp_stat_analysis",
        "question_type": "misconception_probe",
        "stem": "An analyst conducts a two-sample t-test comparing agricultural yields and obtains p = 0.03. A junior statistical officer concludes: 'There is only a 3% probability that the null hypothesis is true.' How should this interpretation be evaluated?",
        "options": [
            "Correct: p-values directly quantify the Bayesian posterior probability of the null hypothesis",
            "Incorrect: In frequentist inference, H₀ is a fixed proposition (not a random variable); p = 0.03 is P(Data >= observed | H₀ is true), NOT P(H₀ | Data)",
            "Correct: 1 - p = 0.97 confirms the research hypothesis with 97% certainty",
            "Incorrect: A p-value below 0.05 implies the sample size was too small to draw any conclusion",
        ],
        "correct_answer": 1,
        "explanation": "A pervasive misconception is treating p-values as the probability of H₀. In frequentist statistics, H₀ has no probability distribution; p is the probability of the data conditional on H₀.",
        "difficulty_b": 0.4,
        "cognitive_level": "analysis",
        "misconception_id": "misc_p_val_01",
        "concepts": [("concept_p_value", "primary")],
    },
    {
        "id": "item_mp_regression_slope_01",
        "competency_id": "comp_stat_analysis",
        "question_type": "misconception_probe",
        "stem": "In an unstandardized linear regression model where Monthly Expenditure (in Rupees) is regressed on Years of Education, the estimated slope coefficient is β̂₁ = 450.0. The officer reports: 'Each additional year of education increases monthly expenditure by 450%.' Is this report correct?",
        "options": [
            "Yes: Linear regression coefficients always represent percentage changes in the dependent variable",
            "No: β̂₁ represents an absolute change of 450 Rupees per additional year of education; percentage interpretations require a log-log or semi-log specification",
            "Yes: If p < 0.001, the coefficient can be interpreted interchangeably as Rupees or percentages",
            "No: The coefficient represents the sample correlation coefficient squared (R²)",
        ],
        "correct_answer": 1,
        "explanation": "Linear model slope is dy/dx (absolute units of Y per unit X). Percentage elasticity (%dy/%dx) requires logarithmic models. Conflating marginal slope with percentage is a major statistical misconception.",
        "difficulty_b": 0.6,
        "cognitive_level": "analysis",
        "misconception_id": "misc_reg_slope_01",
        "concepts": [("concept_coeff_interp", "primary")],
    },
    {
        "id": "item_mp_ci_parameter_01",
        "competency_id": "comp_stat_analysis",
        "question_type": "misconception_probe",
        "stem": "From an NSS consumer survey sample, a 95% confidence interval for mean per capita consumption is computed as [₹2,800, ₹3,400]. An officer states: 'There is a 95% probability that the true population mean falls between ₹2,800 and ₹3,400.' What is the statistical flaw in this statement?",
        "options": [
            "The interval is too wide to make any probability statement",
            "Under frequentist inference, the true population mean is a fixed constant, not a random variable; once computed, the interval either contains the parameter or does not (probability is 1 or 0)",
            "The statement is entirely correct because 95% confidence always means 95% posterior probability",
            "The confidence level must be multiplied by the sample size before calculating parameter probability",
        ],
        "correct_answer": 1,
        "explanation": "In frequentist statistics, parameters are fixed constants. Probability attaches to the random interval procedure across repeated sampling, not to the fixed parameter falling into specific realized numbers.",
        "difficulty_b": 0.8,
        "cognitive_level": "analysis",
        "misconception_id": "misc_conf_interval_param_prob",
        "concepts": [("concept_conf_interp", "primary")],
    },
    {
        "id": "item_mp_sampling_fraction_01",
        "competency_id": "comp_stat_analysis",
        "question_type": "misconception_probe",
        "stem": "A district officer claims: 'State A has 50 million citizens and State B has 5 million. Therefore, to achieve the same precision in poverty estimation, State A requires a sample 10 times larger than State B.' Evaluate this claim.",
        "options": [
            "Correct: Precision is strictly proportional to the sampling fraction (n / N)",
            "Incorrect: When population N is large relative to sample n, estimator precision depends almost entirely on the absolute sample size n, not the sampling fraction",
            "Correct: Finite population correction factors double sample size requirements for large states",
            "Incorrect: State A requires 100 times larger sample size because variance scales quadratically with population",
        ],
        "correct_answer": 1,
        "explanation": "Standard error is σ/sqrt(n). Unless the sampling fraction n/N exceeds 5-10%, the finite population correction sqrt(1 - n/N) ≈ 1. Absolute sample size n drives precision, not the fraction.",
        "difficulty_b": 0.2,
        "cognitive_level": "analysis",
        "misconception_id": "misc_sampling_fraction_precision",
        "concepts": [("concept_sampling", "primary")],
    },
    {
        "id": "item_mp_r_squared_causation_01",
        "competency_id": "comp_stat_analysis",
        "question_type": "misconception_probe",
        "stem": "An econometric report finds an R² of 0.88 between mobile phone penetration and district literacy rate across 600 districts. The researcher concludes that distributing mobile phones causes higher literacy. What is the methodological error?",
        "options": [
            "R² of 0.88 is too low to suggest any association",
            "High R² only quantifies the proportion of variance explained in a linear fit; it cannot establish causal direction or rule out confounding variables (spurious correlation)",
            "The sample size of 600 districts is insufficient for linear regression",
            "R² is only valid when both variables are measured in identical physical units",
        ],
        "correct_answer": 1,
        "explanation": "High R² indicates goodness of fit, never causality. Confounding factors (e.g., district economic development) can generate high R² without any causal link.",
        "difficulty_b": -0.2,
        "cognitive_level": "analysis",
        "misconception_id": "misc_r_squared_causation",
        "concepts": [("concept_regression", "primary")],
    },
    {
        "id": "item_mp_pvalue_effect_size_01",
        "competency_id": "comp_stat_analysis",
        "question_type": "misconception_probe",
        "stem": "A nationwide census sample of 250,000 records detects a statistically significant difference in mean wage between two sectors with p < 0.0001. The actual estimated wage difference is ₹1.20 per month. An officer recommends restructuring sector salary policies based on the 'overwhelming statistical significance'. What error is being made?",
        "options": [
            "Statistical significance with large n was achieved, but the practical effect size is negligible; p-values reflect sample size as well as effect magnitude",
            "P-values below 0.001 are mathematically invalid in samples exceeding 10,000 records",
            "The officer should have used a chi-square test instead of comparing sector means",
            "Wage differences below ₹50 cannot be statistically tested under central limit theorem",
        ],
        "correct_answer": 0,
        "explanation": "With large samples, even trivial effect sizes achieve extreme statistical significance. High statistical significance (small p) must never be conflated with practical or policy importance.",
        "difficulty_b": 1.1,
        "cognitive_level": "analysis",
        "misconception_id": "misc_p_val_01",
        "concepts": [("concept_p_value", "primary")],
    },
    {
        "id": "item_mp_std_dev_vs_error_01",
        "competency_id": "comp_stat_analysis",
        "question_type": "misconception_probe",
        "stem": "An investigator collects a larger sample (increasing n from 100 to 1,600) expecting the population standard deviation s to decrease fourfold. Why is this expectation mathematically flawed?",
        "options": [
            "Standard deviation of the population σ is a fixed dispersion parameter that sample s estimates; increasing n refines its precision, whereas standard error (s / sqrt(n)) shrinks fourfold",
            "Standard deviation increases linearly with sample size n",
            "The standard error does not change with sample size",
            "Degrees of freedom (n - 1) cancel out any reduction in variance",
        ],
        "correct_answer": 0,
        "explanation": "Standard deviation measures individual dispersion (does not shrink to 0 as n grows). Standard error measures estimator precision (shrinks as 1/sqrt(n)). Conflating SD and SE is a classic error.",
        "difficulty_b": 0.1,
        "cognitive_level": "analysis",
        "concepts": [("concept_std_error", "primary"), ("concept_variance", "prerequisite")],
    },
    {
        "id": "item_mp_heteroscedasticity_ols_01",
        "competency_id": "comp_stat_analysis",
        "question_type": "misconception_probe",
        "stem": "If residual variance increases with firm size in an establishment survey (heteroscedasticity), an officer claims: 'The OLS coefficient estimates β̂ are now biased.' Is this claim accurate?",
        "options": [
            "Yes: Heteroscedasticity introduces first-order bias into parameter estimates",
            "No: OLS coefficient estimates remain unbiased and consistent; however, standard errors are biased, rendering standard hypothesis tests and confidence intervals invalid",
            "Yes: Heteroscedasticity causes the R² value to exceed 1.0",
            "No: Heteroscedasticity improves the efficiency of OLS estimates",
        ],
        "correct_answer": 1,
        "explanation": "Heteroscedasticity violates the Gauss-Markov spherical error assumption: OLS coefficients remain unbiased, but conventional standard errors are incorrect, requiring Huber-White robust standard errors.",
        "difficulty_b": 1.0,
        "cognitive_level": "analysis",
        "concepts": [("concept_regression", "primary")],
    },

    # =========================================================================
    # 3. APPLICATION ITEMS (Realistic official survey scenarios, b in [-0.2, +1.8])
    # =========================================================================
    {
        "id": "item_app_neyman_allocation_01",
        "competency_id": "comp_stat_analysis",
        "question_type": "application",
        "stem": "In an NSS agricultural survey across two farming zones, Zone 1 has N₁ = 10,000 farms with high yield standard deviation σ₁ = 40 quintals. Zone 2 has N₂ = 10,000 farms with uniform yield σ₂ = 10 quintals. Under Neyman optimum allocation with equal sampling costs, how should a total sample of n = 1,000 farms be allocated?",
        "options": [
            "500 to Zone 1, 500 to Zone 2 (proportional allocation)",
            "800 to Zone 1, 200 to Zone 2 (allocated proportional to N_h * σ_h)",
            "200 to Zone 1, 800 to Zone 2",
            "1,000 to Zone 1, 0 to Zone 2",
        ],
        "correct_answer": 1,
        "explanation": "Neyman allocation assigns sample size n_h proportional to N_h * σ_h. Since N₁ = N₂ but σ₁ = 4 * σ₂, Zone 1 receives 4/(4+1) = 80% (800) and Zone 2 receives 20% (200).",
        "difficulty_b": 1.2,
        "cognitive_level": "application",
        "concepts": [("concept_sampling", "primary")],
    },
    {
        "id": "item_app_ht_estimator_01",
        "competency_id": "comp_stat_analysis",
        "question_type": "application",
        "stem": "In a probability sample of industrial units, enterprise k is selected with inclusion probability π_k = 0.05 and reports output Y_k = ₹2,000,000. What is enterprise k's contribution to the Horvitz-Thompson estimated population total?",
        "options": [
            "₹100,000 (Y_k * π_k)",
            "₹40,000,000 (Y_k / π_k, weighted by sampling design weight w_k = 20)",
            "₹2,000,000 (unweighted)",
            "₹10,000,000 (Y_k * 5)",
        ],
        "correct_answer": 1,
        "explanation": "The Horvitz-Thompson estimator weights each observation by its design weight w_k = 1/π_k. For π_k = 0.05, w_k = 20. Contribution = 2,000,000 * 20 = ₹40,000,000.",
        "difficulty_b": 0.5,
        "cognitive_level": "application",
        "concepts": [("concept_ht_estimator", "primary")],
    },
    {
        "id": "item_app_dummy_variable_trap_01",
        "competency_id": "comp_stat_analysis",
        "question_type": "application",
        "stem": "When modeling household expenditure across 4 administrative regions (North, South, East, West) with an intercept term β₀, an econometrician includes all 4 indicator dummy variables D_North, D_South, D_East, and D_West in an OLS regression. What computational issue will occur?",
        "options": [
            "The model will estimate perfectly with enhanced degrees of freedom",
            "Perfect multicollinearity (dummy variable trap): (X'X) is singular and cannot be inverted because the sum of the four dummies equals the constant vector (1)",
            "Heteroscedasticity will automatically be eliminated",
            "The R² value will become negative",
        ],
        "correct_answer": 1,
        "explanation": "Including all K category dummies plus an intercept creates exact collinearity (sum D_k = 1). One category must be omitted as the baseline/reference category.",
        "difficulty_b": 0.8,
        "cognitive_level": "application",
        "concepts": [("concept_regression", "primary")],
    },
    {
        "id": "item_app_cluster_design_effect_01",
        "competency_id": "comp_stat_analysis",
        "question_type": "application",
        "stem": "A cluster survey of 100 villages (clusters of size m = 20 households) estimates household sanitation access with intraclass correlation coefficient ρ = 0.10. What is the Design Effect (Deff) of this two-stage cluster design compared to simple random sampling?",
        "options": [
            "Deff = 1.0 (equivalent to SRS)",
            "Deff = 1 + (m - 1) * ρ = 1 + (19 * 0.10) = 2.90",
            "Deff = 20 * 0.10 = 2.00",
            "Deff = 0.10 / 20 = 0.005",
        ],
        "correct_answer": 1,
        "explanation": "Design Effect for cluster sampling is Deff = 1 + (m - 1) * ρ. With m = 20 and ρ = 0.10, Deff = 1 + 1.9 = 2.90, indicating variance is 2.9 times larger than SRS.",
        "difficulty_b": 1.4,
        "cognitive_level": "application",
        "concepts": [("concept_sampling", "primary")],
    },
    {
        "id": "item_app_log_transformation_interp_01",
        "competency_id": "comp_stat_analysis",
        "question_type": "application",
        "stem": "An OLS model estimates ln(Wage) = 8.20 + 0.085 * Education_Years. How is the coefficient 0.085 correctly interpreted in official reporting?",
        "options": [
            "An additional year of education increases wage by ₹0.085 per month",
            "An additional year of education is associated with an approximate 8.5% increase in wage (ceteris paribus)",
            "Wage increases by 8.5 Rupees for every 100 years of education",
            "Education explains 8.5% of the total variance in wage",
        ],
        "correct_answer": 1,
        "explanation": "In a log-linear model ln(Y) = β₀ + β₁X, a 1-unit change in X corresponds to approximately (100 * β₁)% relative change in Y (100 * 0.085 = 8.5%).",
        "difficulty_b": 0.2,
        "cognitive_level": "application",
        "concepts": [("concept_coeff_interp", "primary")],
    },
    {
        "id": "item_app_outlier_winsorization_01",
        "competency_id": "comp_stat_analysis",
        "question_type": "application",
        "stem": "In processing Annual Survey of Industries (ASI) microdata, an establishment reports fuel consumption 500 times higher than industry median due to a keypunch error. Before tabulation, what robust treatment preserves sample size without distorting aggregate totals?",
        "options": [
            "Delete the entire manufacturing sector records from the survey",
            "Verify against physical schedules, re-contact or apply statistical winsorization/imputation to cap the extreme value at the 99th percentile boundary",
            "Multiply all other firms' consumption by 500 to maintain balance",
            "Ignore the anomaly because OLS regression naturally suppresses outliers",
        ],
        "correct_answer": 1,
        "explanation": "In official data cleaning, outliers from recording errors are audited and resolved via verification, winsorization (capping), or donor imputation rather than unprincipled schedule deletion.",
        "difficulty_b": -0.2,
        "cognitive_level": "application",
        "concepts": [("concept_variance", "primary")],
    },
    {
        "id": "item_app_confidence_interval_width_01",
        "competency_id": "comp_stat_analysis",
        "question_type": "application",
        "stem": "To halve the width of a 95% confidence interval for mean household income without altering the sampling design, by what factor must the sample size n be increased?",
        "options": [
            "Double the sample size (2x)",
            "Quadruple the sample size (4x)",
            "Increase sample size by eightfold (8x)",
            "Increase sample size by 16-fold (16x)",
        ],
        "correct_answer": 1,
        "explanation": "CI width is proportional to SE = σ / sqrt(n). Halving the margin of error requires sqrt(n_new) = 2 * sqrt(n_old), which implies n_new = 4 * n_old.",
        "difficulty_b": 0.4,
        "cognitive_level": "application",
        "concepts": [("concept_conf_interval", "primary")],
    },
    {
        "id": "item_app_post_stratification_01",
        "competency_id": "comp_stat_analysis",
        "question_type": "application",
        "stem": "In a national labour force survey, young urban workers aged 18-25 are under-represented due to non-response (realized sample has 8% vs Census benchmark of 14%). How is this non-response bias corrected during tabulation?",
        "options": [
            "Discard all records from urban areas",
            "Apply post-stratification adjustment factors (w_post = w_design * (N_benchmark / N_sample_est)) to align sample totals with known demographic census controls",
            "Run an unweighted regression without demographic controls",
            "Replace all missing youth responses with zero income",
        ],
        "correct_answer": 1,
        "explanation": "Post-stratification weighting calibrates sample weights so that weighted sample totals match known external demographic totals (Census benchmarks), mitigating non-response bias.",
        "difficulty_b": 1.6,
        "cognitive_level": "application",
        "concepts": [("concept_sampling", "primary")],
    },

    # =========================================================================
    # 4. INTEGRATED CONCEPT (Multi-concept graph synthesis, b in [+0.5, +2.5])
    # =========================================================================
    {
        "id": "item_int_clt_se_ci_01",
        "competency_id": "comp_stat_analysis",
        "question_type": "integrated_concept",
        "stem": "Synthesizing the Central Limit Theorem, Standard Error, and Confidence Intervals: A skewed state income distribution has known σ = ₹12,000. A survey draws n = 900 households. The analyst computes a 95% confidence interval for the mean. Which complete synthesis of concepts explains why this interval is valid?",
        "options": [
            "The income distribution itself becomes normally distributed because n > 30",
            "By CLT, the sampling distribution of the mean is approximately normal with SE = 12,000 / sqrt(900) = ₹400; hence x̄ ± 1.96 * 400 yields 95% long-run frequentist coverage",
            "The sample variance becomes zero because n = 900 is large enough to eliminate all sampling error",
            "The confidence interval measures individual household variation across the 900 surveyed units",
        ],
        "correct_answer": 1,
        "explanation": "Integrates CLT (sampling distribution normality), SE formula (σ/sqrt(n) = 400), and CI construction (x̄ ± 1.96*SE) to justify interval validity despite underlying population skewness.",
        "difficulty_b": 1.5,
        "cognitive_level": "synthesis",
        "concepts": [
            ("concept_sampling_dist", "prerequisite"),
            ("concept_std_error", "prerequisite"),
            ("concept_conf_interval", "integrated_component"),
        ],
    },
    {
        "id": "item_int_sample_size_precision_power_01",
        "competency_id": "comp_stat_analysis",
        "question_type": "integrated_concept",
        "stem": "Connecting Sample Size, Standard Error, and Hypothesis Testing Power: In testing whether a new national skilling initiative raises mean wage by at least ₹500, quadrupling the sample size from 400 to 1,600 has which combined effect on SE and statistical power (1 - β)?",
        "options": [
            "SE doubles and power decreases",
            "SE is halved (from σ/20 to σ/40), which narrows the sampling distribution under H₁ and substantially increases test power to detect the ₹500 effect",
            "SE is unchanged but Type I error rate α is reduced to 0",
            "SE decreases by fourfold while statistical power remains fixed at 0.50",
        ],
        "correct_answer": 1,
        "explanation": "Quadrupling sample size halves standard error (1/sqrt(4)=0.5), which sharpens test statistics and increases statistical power (probability of correctly rejecting false H₀).",
        "difficulty_b": 1.7,
        "cognitive_level": "synthesis",
        "concepts": [
            ("concept_std_error", "prerequisite"),
            ("concept_hyp_testing", "integrated_component"),
        ],
    },
    {
        "id": "item_int_regression_residuals_inference_01",
        "competency_id": "comp_stat_analysis",
        "question_type": "integrated_concept",
        "stem": "Integrating OLS Regression, Variance Estimation, and t-Testing: If residual variance s²_e in an agricultural regression model doubles due to unrecorded weather shocks, what is the downstream impact on the t-statistic t = β̂₁ / SE(β̂₁) for testing fertilizer significance?",
        "options": [
            "SE(β̂₁) decreases and the t-statistic increases",
            "SE(β̂₁) increases by sqrt(2) ≈ 1.414, causing the calculated t-statistic to decrease by ~29%, widening the p-value and reducing statistical significance",
            "The estimated slope coefficient β̂₁ automatically doubles",
            "Residual variance has no mathematical relationship to regression standard errors",
        ],
        "correct_answer": 1,
        "explanation": "SE(β̂₁) = sqrt(s²_e * (X'X)⁻¹₁₁). Doubling error variance increases SE by sqrt(2), which shrinks the t-ratio t = β̂₁ / SE(β̂₁), inflating the p-value.",
        "difficulty_b": 1.9,
        "cognitive_level": "synthesis",
        "concepts": [
            ("concept_regression", "prerequisite"),
            ("concept_variance", "prerequisite"),
            ("concept_p_value", "integrated_component"),
        ],
    },
    {
        "id": "item_int_sampling_weights_regression_01",
        "competency_id": "comp_stat_analysis",
        "question_type": "integrated_concept",
        "stem": "Connecting Complex Survey Sampling and Regression Modeling: When estimating an Engel expenditure curve from stratified two-stage NSS microdata, why must sampling design weights (w_i = 1/π_i) be incorporated into Weighted Least Squares (WLS)?",
        "options": [
            "Because unweighted OLS always produces negative R² values",
            "Because unequal inclusion probabilities (e.g. oversampling affluent clusters) cause unweighted OLS sample moments to diverge from population parameters, producing biased population estimates",
            "Weights are only needed if the software cannot compute matrix inverses",
            "Weighting removes all survey non-response automatically without imputation",
        ],
        "correct_answer": 1,
        "explanation": "In complex surveys with unequal probabilities of selection (PPS), unweighted estimators target sample distribution rather than finite population parameters. Design weighting restores unbiasedness.",
        "difficulty_b": 2.1,
        "cognitive_level": "synthesis",
        "concepts": [
            ("concept_sampling", "prerequisite"),
            ("concept_regression", "integrated_component"),
            ("concept_ht_estimator", "integrated_component"),
        ],
    },
    {
        "id": "item_int_frequentist_chain_01",
        "competency_id": "comp_stat_analysis",
        "question_type": "integrated_concept",
        "stem": "Synthesizing Confidence Intervals and Two-Sided Hypothesis Tests: In a linear model, a 95% confidence interval for policy parameter β₁ is [-0.02, 0.48]. Without calculating the test statistic, what can be deduced about the two-sided hypothesis test H₀: β₁ = 0 at α = 0.05?",
        "options": [
            "H₀ is rejected at α = 0.05 because the upper bound 0.48 is positive",
            "H₀ cannot be rejected at α = 0.05 because the null value 0 is contained within the 95% confidence interval (p > 0.05)",
            "The test is inconclusive because confidence intervals cannot be linked to hypothesis tests",
            "The p-value must be exactly equal to 0.025",
        ],
        "correct_answer": 1,
        "explanation": "A (1 - α) confidence interval consists of all parameter values that would NOT be rejected by a two-sided test at significance level α. Since 0 is inside [-0.02, 0.48], H₀ cannot be rejected at α = 0.05.",
        "difficulty_b": 1.3,
        "cognitive_level": "synthesis",
        "concepts": [
            ("concept_conf_interval", "prerequisite"),
            ("concept_hyp_testing", "prerequisite"),
            ("concept_p_value", "integrated_component"),
        ],
    },
    {
        "id": "item_int_multistage_variance_estimation_01",
        "competency_id": "comp_stat_analysis",
        "question_type": "integrated_concept",
        "stem": "Synthesizing Stratification and Cluster Variance: In a two-stage stratified survey (villages as PSUs, households as SSUs), an analyst incorrectly treats the microdata as a Simple Random Sample (SRS). What is the combined consequence on estimated standard errors and confidence interval coverage?",
        "options": [
            "SRS formulas overestimate variance, making confidence intervals too wide",
            "SRS formulas ignore positive clustering (Deff > 1), severely underestimating true standard errors and producing falsely narrow confidence intervals with actual coverage far below 95%",
            "There is no consequence because stratum differences and cluster effects cancel each other out exactly",
            "The point estimates of totals become mathematically undefined",
        ],
        "correct_answer": 1,
        "explanation": "Ignoring positive intra-cluster correlation underestimates variance (Deff > 1). Standard errors computed via SRS formulas are too small, leading to anti-conservative test statistics and degraded CI coverage.",
        "difficulty_b": 2.3,
        "cognitive_level": "synthesis",
        "concepts": [
            ("concept_sampling", "prerequisite"),
            ("concept_std_error", "prerequisite"),
            ("concept_conf_interval", "integrated_component"),
        ],
    },
    {
        "id": "item_int_macro_sna_sampling_01",
        "competency_id": "comp_stat_analysis",
        "question_type": "integrated_concept",
        "stem": "Integrating Survey Sampling and National Accounts (SNA 2008): In compiling Gross Value Added (GVA) for the unorganized manufacturing sector, how do sample estimation errors propagate into national GDP estimates?",
        "options": [
            "GVA is compiled solely from administrative tax records, completely independent of sample surveys",
            "Sample survey estimates of per-worker GVA are blown up using enterprise survey population weights; sampling variance and design weights directly determine the precision and reliability of informal GVA aggregates",
            "Sampling error in enterprise surveys is automatically zeroed out during seasonal adjustment",
            "Only corporate balance sheet data are subject to statistical estimation error",
        ],
        "correct_answer": 1,
        "explanation": "Unorganized sector GVA relies on sample surveys (NSS Enterprise surveys). Survey design weights and mean value-added estimates directly scale national informal sector aggregates.",
        "difficulty_b": 2.0,
        "cognitive_level": "synthesis",
        "concepts": [
            ("concept_sampling", "prerequisite"),
            ("concept_ht_estimator", "integrated_component"),
            ("concept_gva_compilation", "integrated_component"),
        ],
    },
    {
        "id": "item_int_omitted_variable_bias_01",
        "competency_id": "comp_stat_analysis",
        "question_type": "integrated_concept",
        "stem": "Synthesizing Specification Error and Causal Inference: In a linear regression of district crop yield Y on irrigation infrastructure X₁, soil fertility X₂ is omitted. If irrigation is preferentially built in highly fertile districts (Cov(X₁, X₂) > 0) and fertility positively impacts yield (β₂ > 0), what is the direction of Omitted Variable Bias in the estimated irrigation coefficient β̂₁?",
        "options": [
            "β̂₁ is unbiased because OLS is always BLUE",
            "β̂₁ has positive upward bias (E[β̂₁] = β₁ + β₂ * Cov(X₁,X₂)/Var(X₁) > β₁), leading policymakers to overestimate the standalone impact of irrigation",
            "β̂₁ has negative downward bias",
            "The bias cannot be determined without knowing the sample size n",
        ],
        "correct_answer": 1,
        "explanation": "Omitted Variable Bias formula is E[β̂₁] = β₁ + β₂ * (Cov(X₁, X₂)/Var(X₁)). With positive fertility impact (β₂ > 0) and positive placement correlation, the estimated slope overstates the true irrigation effect.",
        "difficulty_b": 2.2,
        "cognitive_level": "synthesis",
        "concepts": [
            ("concept_regression", "prerequisite"),
            ("concept_coeff_interp", "integrated_component"),
        ],
    },
]


def seed_assessment_items(db: Session) -> int:
    """Seeds calibrated prototype assessment items into the database."""
    seeded_count = 0

    for item_data in SEED_ASSESSMENT_ITEMS:
        item_id = item_data["id"]
        existing = db.query(AssessmentItem).filter(AssessmentItem.id == item_id).first()
        if existing:
            continue

        misc_id = item_data.get("misconception_id")
        if misc_id:
            exists = db.query(Misconception).filter(Misconception.id == misc_id).first()
            if not exists:
                alias_map = {
                    "misc_p_val_01": "misc_p_value_null_prob",
                    "misc_reg_slope_01": "misc_reg_slope_elasticity",
                    "misc_r_squared_causation": "misc_correlation_causation",
                }
                candidate = alias_map.get(misc_id)
                if candidate and db.query(Misconception).filter(Misconception.id == candidate).first():
                    misc_id = candidate
                else:
                    misc_id = None

        item = AssessmentItem(
            id=item_id,
            competency_id=item_data["competency_id"],
            question_type=item_data["question_type"],
            stem=item_data["stem"],
            options=json.dumps(item_data["options"]),
            correct_answer=item_data["correct_answer"],
            explanation=item_data["explanation"],
            difficulty_b=item_data["difficulty_b"],
            cognitive_level=item_data.get("cognitive_level", "application"),
            misconception_id=misc_id,
            status="validated",
            review_status="approved",
            review_notes="Expert calibrated baseline prototype item for civil service statistics assessment.",
        )
        db.add(item)
        db.flush()

        # Add concept mappings
        for concept_id, role in item_data.get("concepts", []):
            if not db.query(CompetencyNode).filter(CompetencyNode.id == concept_id).first():
                alias_map = {
                    "concept_ht_estimator": "concept_survey_estim",
                    "concept_gva_compilation": "concept_survey_estim",
                }
                concept_id = alias_map.get(concept_id)
                if not concept_id or not db.query(CompetencyNode).filter(CompetencyNode.id == concept_id).first():
                    continue

            mapping = AssessmentItemConcept(
                item_id=item.id,
                concept_id=concept_id,
                role=role,
            )
            db.add(mapping)

        seeded_count += 1

    db.commit()
    return seeded_count


seed_assessment_bank = seed_assessment_items


if __name__ == "__main__":
    db = SessionLocal()
    try:
        count = seed_assessment_items(db)
        print(f"Successfully seeded {count} adaptive assessment items into database.")
    finally:
        db.close()
