# National Statistical Systems Training Academy (NSSTA)
## Course Module 102: Survey Sampling Designs and Estimation Principles
*Authority: Ministry of Statistics & Programme Implementation (MoSPI), Government of India*
*Document Type: Official Curriculum Reference Manual (Demonstration Edition)*

---

### Section 1: Sampling Theory and Sampling Distributions

In official survey operations (e.g. Periodic Labour Force Survey - PLFS, Annual Survey of Unincorporated Enterprises - ASUE), sample estimates must reflect the known probability selection design.

When a statistic (such as sample mean $\bar{y}$) is calculated from repeated probability samples drawn from the same population, the distribution of these hypothetical estimates is known as the **Sampling Distribution**.

The variability of the sampling distribution depends on:
1. The population variance $\sigma^2$
2. The sample size $n$
3. The complex survey design factor (DEFF)

---

### Section 2: Distinguishing Standard Deviation and Standard Error

A frequent operational misconception in official statistical reporting is conflating **Standard Deviation** with **Standard Error**:

* **Standard Deviation (SD)** measures the empirical dispersion or spread of individual observations around their arithmetic mean within a single dataset.
* **Standard Error (SE)** measures the precision of a sample estimator across hypothetical repeated samples. It is the standard deviation of the estimator's sampling distribution.

$$\text{SE}(\bar{y}) = \frac{S}{\sqrt{n}} \sqrt{1 - f}$$

Where:
* $S$ is sample standard deviation
* $n$ is sample size
* $f = \frac{n}{N}$ is sampling fraction (finite population correction)

**Key Diagnostic Rule**: Standard error is NOT the same as standard deviation. Reporting standard deviation in place of standard error severely misrepresents the precision of official estimators.

---

### Section 3: Design Weights and Horvitz-Thompson Aggregate Estimation

Official socio-economic surveys do not utilize unweighted averages. Every sample unit $i$ has an inclusion probability $\pi_i$ determined by the multi-stage stratified sampling design.

The base design weight $w_i$ is defined as the inverse of selection probability:
$$w_i = \frac{1}{\pi_i}$$

The unbiased aggregate estimator of population total $Y$ is the Horvitz-Thompson estimator:
$$\hat{Y}_{HT} = \sum_{i \in s} \frac{y_i}{\pi_i} = \sum_{i \in s} w_i y_i$$

Failure to apply design weights results in systemic selection bias whenever sampling units have unequal inclusion probabilities across rural and urban strata.
