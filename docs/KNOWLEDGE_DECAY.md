# STAT-GAP AI — Knowledge Decay & Proactive Refresher Engine

## 1. The Operational Challenge: Invisible Cognitive Decay

In civil service administration, an officer often undergoes intensive training (e.g., a two-week NSSTA residential course on National Accounts), achieves certification, and is then deployed to duties where that specialized methodology is only exercised intermittently. Over 6 to 18 months, procedural and mathematical nuances naturally fade.

Existing LMS platforms operate on a static "once certified, always certified" assumption.

STAT-GAP AI introduces an **automated Knowledge Decay Monitoring Engine** based on cognitive science principles (Ebbinghaus forgetting curve) that tracks retention decay and triggers micro-refreshers **before** procedural errors occur in official statistics.

```mermaid
flowchart LR
    Verify["1. Independent Verification Passed\n(Initial Retention R_0 = 1.0)"] --> Time["2. Time Elapsed (t Days)\n(Ebbinghaus Decay R(t) = e^(-t/S))"]
    Time --> Check{"3. Retention Threshold Check"}
    Check -->|R(t) >= 0.75| Stable["STABLE (Low Risk)\nNo action needed"]
    Check -->|0.60 <= R(t) < 0.75| Monitor["MODERATE (Monitoring)\nPassive refresher suggestion"]
    Check -->|0.45 <= R(t) < 0.60| Alert["AT RISK (High Risk)\nAutomated Refresher Trigger"]
    Check -->|R(t) < 0.45| Expire["CRITICAL / EXPIRED\nTask deployment suspended\nMandatory reassessment"]

    Alert --> Refresher["4. 5-Minute Micro-Refresher\n(Targeted practice on high-decay concepts)"]
    Refresher --> Boost["5. Stability Boost (S_new = S_old * 1.5)\nRetention Reset to 1.0"]
    Boost --> Time
```

---

## 2. Mathematical Formulation of Cognitive Decay

### 2.1 The Ebbinghaus Decay Equation
The retention probability $R(t)$ at time $t$ (days since last verified interaction) is:

$$R(t) = R_0 \cdot e^{-\frac{t}{S}}$$

Where:
- $R_0$: Baseline retention at $t = 0$ (default $1.0$).
- $t$: Elapsed days since last verified assessment, practical task, or refresher.
- $S$: Memory stability factor in days (the time for retention to drop to $e^{-1} \approx 36.8\%$).

### 2.2 Deterministic Stability ($S$) Formula
Memory stability is not arbitrary; it depends directly on how solidly the officer mastered the competency during initial verification:

$$S = S_0 \cdot \left( 1.0 + 0.40 \cdot \frac{C - 75.0}{25.0} \right)$$

Where:
- $S_0$: Base stability constant ($65.0$ days).
- $C$: Composite verification score ($0.70 \cdot E_{\text{independent}} + 0.30 \cdot E_{\text{practical}}$ for practical competencies, or $E_{\text{independent}}$ for theoretical competencies).
- The statutory pass threshold is $75.0$.
- **Boundary Clamping**: Stability is strictly clamped to:
  $$S \in [S_{\min}, S_{\max}] = [30.0, 95.0] \text{ days}$$

#### Representative Boundary Behavior
- $C = 100\% \implies S = 65.0 \cdot (1 + 0.40 \cdot 1.0) = 91.0$ days.
- $C = 75\% \implies S = 65.0 \cdot (1 + 0) = 65.0$ days.
- $C = 50\% \implies S = 65.0 \cdot (1 - 0.40) = 39.0$ days.
- $C \le 0\% \implies S = 30.0$ days (clamped minimum).

---

## 3. Risk Levels & Operational Thresholds

| Risk Category | Retention Range | System State & Supervisory Indication | Operational Action |
|:---:|:---:|:---|:---|
| **Low Risk** | $\mathbf{R(t) \ge 0.75}$ | **Competency Stable**: Concepts firmly retained in operational memory. | No intervention; regular decay monitoring. |
| **Moderate Risk** | $\mathbf{0.60 \le R(t) < 0.75}$ | **Monitoring Band**: Beginning of conceptual fuzziness. | Display passive refresher card on dashboard. |
| **At Risk** | $\mathbf{0.45 \le R(t) < 0.60}$ | **At Risk**: High probability of procedural error if assigned to complex task. | **Trigger proactive alert**: Send 5-minute targeted micro-refresher notification. |
| **Critical / Expired** | $\mathbf{R(t) < 0.45}$ | **Competency Lapsed**: Memory retention severely degraded. | **Suspend task readiness**: Officer must complete reassessment before unsupervised duty. |

---

## 4. Spaced Repetition Reinforcement

When an officer completes an **At Risk** refresher:
1. **Retention Reset**: Current retention $R(t)$ resets immediately to $1.0$.
2. **Stability Multiplication**: Due to the spacing effect, the new stability expands:
   $$S_{\text{new}} = \min(120.0, S_{\text{old}} \cdot 1.5)$$
3. **Audit Event**: An audit log entry is written to `audit_events` recording the refresher completion, timestamp, and updated stability.
