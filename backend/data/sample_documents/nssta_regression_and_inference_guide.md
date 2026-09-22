# National Statistical Systems Training Academy (NSSTA)
## Course Module 201: Statistical Inference, Linear Modeling, and Hypothesis Testing
*Authority: Ministry of Statistics & Programme Implementation (MoSPI), Government of India*
*Document Type: Official Curriculum Reference Manual (Demonstration Edition)*

---

### Section 1: Proper Interpretation of Linear Regression Coefficients

In a standard Ordinary Least Squares (OLS) regression model:
$$Y = \beta_0 + \beta_1 X_1 + \beta_2 X_2 + \epsilon$$

The parameter $\beta_1$ represents the **absolute marginal change in the units of dependent variable $Y$** associated with a 1-unit increase in independent variable $X_1$, holding all other variables constant (*ceteris paribus*):
$$\beta_1 = \frac{\partial Y}{\partial X_1}$$

#### Systematic Misconception: Slope Conflated with Percentage Elasticity
Statistical officers frequently commit the cognitive error of interpreting an unstandardized slope coefficient directly as a percentage change.

* **False Interpretation**: "If $\beta_1 = 0.40$ for Income ($Y$ in Rupees) on Education ($X$ in Years), an additional year of education raises income by 40%."
* **Correct Mathematical Truth**: Each additional year of education increases income by **0.40 Rupees** (absolute units of $Y$).
* **Elasticity Formula**: Percentage elasticity is defined as $\frac{\% \Delta Y}{\% \Delta X} = \beta_1 \frac{X}{Y}$. A direct percentage interpretation is only valid in a logarithmic specification:
$$\ln(Y) = \alpha + \beta_1 \ln(X) + \epsilon$$

---

### Section 2: Rigorous Frequentist P-Value Interpretation

In statistical hypothesis testing under the Neyman-Pearson / Fisher framework:
* $H_0$: The null hypothesis (e.g. $\mu_1 = \mu_2$, or $\beta_1 = 0$)
* $H_1$: The alternative hypothesis

#### Definition of P-value:
The **p-value** is the probability of obtaining a test statistic at least as extreme as the observed value, **conditional on the assumption that the null hypothesis $H_0$ is true**:
$$\text{p-value} = P(T \ge t_{\text{obs}} \mid H_0)$$

#### Systematic Misconception: Null Hypothesis Truth Probability
* **False Belief**: "A p-value of 0.03 implies that there is a 3% probability that the null hypothesis is true."
* **Correct Mathematical Truth**: The p-value is $P(\text{Data} \mid H_0)$, NOT $P(H_0 \mid \text{Data})$. In frequentist inference, $H_0$ is not a random variable with a probability distribution; either $H_0$ is factually true or false in the population. A small p-value indicates that the sample data is statistically rare under $H_0$.

---

### Section 3: Frequentist Confidence Intervals vs Parameter Randomness

Given sample estimator $\hat{\theta}$ and standard error $\text{SE}(\hat{\theta})$, the frequentist $(1 - \alpha)$ confidence interval is constructed as:
$$\text{CI}_{1-\alpha} = [\hat{\theta} - z_{\alpha/2} \text{SE}(\hat{\theta}),\ \hat{\theta} + z_{\alpha/2} \text{SE}(\hat{\theta})]$$

#### Systematic Misconception: Parameter Probability
* **False Belief**: "There is a 95% probability that the true population mean $\mu$ falls within the single calculated interval $[24.2, 28.6]$."
* **Correct Mathematical Truth**: In frequentist statistics, population parameter $\mu$ is a fixed, unknown constant. It possesses no probability distribution. Either $\mu \in [24.2, 28.6]$ or it does not; the probability is either 1 or 0.
* **The Long-Run Coverage Concept**: The "95%" refers exclusively to the **reliability of the estimation procedure**. If 100 independent random samples are collected and 100 confidence intervals are calculated, approximately 95 of those intervals will cover the fixed parameter $\mu$, and 5 will not.

---

### Section 4: Statistical Significance vs Practical Policy Importance

A statistically significant finding ($p < 0.05$) indicates that the observed sample difference is unlikely to have arisen purely from random sampling fluctuations under the null model.

However, in large administrative datasets ($N > 100,000$), trivial and negligible differences (e.g. a 0.01% wage gap) will achieve high statistical significance ($p < 0.0001$).

Officers must always evaluate the **effect size** and confidence intervals to assess substantive policy importance rather than relying solely on arbitrary p-value thresholds.
