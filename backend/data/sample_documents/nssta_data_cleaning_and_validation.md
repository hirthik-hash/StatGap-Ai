# National Statistical Systems Training Academy (NSSTA)
## Course Module 305: Official Survey Data Cleaning, Outlier Detection, and Imputation
*Authority: Ministry of Statistics & Programme Implementation (MoSPI), Government of India*
*Document Type: Official Curriculum Reference Manual (Demonstration Edition)*

---

### Section 1: Multivariate Outlier Detection using Mahalanobis Distance

In multidimensional survey schedules (such as enterprise revenue, input costs, and electricity consumption), univariate outlier filters (e.g. 3 standard deviations from mean) fail to detect units that violate structural relationships between correlated variables.

The **Mahalanobis Distance ($D_M$)** accounts for the covariance matrix $\Sigma$ across dimensions:
$$D_M(x) = \sqrt{(x - \mu)^T \Sigma^{-1} (x - \mu)}$$

Under multivariate normality, squared Mahalanobis distance follows a Chi-square distribution with $p$ degrees of freedom ($\chi^2_p$). Points with $D_M^2 > \chi^2_{p, 0.999}$ are flagged as multivariate structural anomalies requiring field verification.

---

### Section 2: Mean Imputation Pitfalls and Variance Preservation

When addressing non-response in official datasets, substituting missing values with the unweighted or conditional arithmetic mean ($\bar{x}$) introduces severe structural distortions:

1. **Variance Shrinkage**: Replacing missing observations with a single central point artificially concentrates mass at the mean, reducing estimated sample variance:
$$\text{Var}(\text{imputed data}) < \text{Var}(\text{true population})$$
2. **Deflated Standard Errors**: Artificially compressed variance leads to underestimated standard errors and invalidates hypothesis tests (inflating Type I error rates).
3. **Correlation Attenuation**: Covariance between imputed variables and other survey fields is distorted toward zero.

**Approved Statutory Technique**: Statistical officers must employ stochastic imputation, hot-deck nearest neighbor donor matching, or multiple imputation with residual noise terms to preserve the empirical variance-covariance structure.
