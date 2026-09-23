/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AccessibilityProvider } from './components/common/AccessibilityContext';
import { User, Competency, QuizAnswerRecord } from './types';
import { AuthService } from './services/authService';
import { CompetencyService } from './services/competencyService';
import { DiagnosticService } from './services/diagnosticService';

// Layout Components
import { Header } from './components/common/Header';
import { Sidebar, NavPageId } from './components/common/Sidebar';
import { LogoutModal } from './components/common/LogoutModal';
import { DemoWalkthroughModal } from './components/common/DemoWalkthroughModal';

// Pages
import { SyncoreeIntroPage } from './components/pages/SyncoreeIntroPage';
import { LoginPage } from './components/pages/LoginPage';
import { RegisterPage } from './components/pages/RegisterPage';
import { DashboardPage } from './components/pages/DashboardPage';
import { CompetencyMapPage } from './components/pages/CompetencyMapPage';
import { CompetencyDetailPage } from './components/pages/CompetencyDetailPage';
import { WhyGapPage } from './components/pages/WhyGapPage';
import { MisconceptionLibraryPage } from './components/pages/MisconceptionLibraryPage';
import { PersonalizedLearningPage } from './components/pages/PersonalizedLearningPage';
import { AdaptiveQuizPage } from './components/pages/AdaptiveQuizPage';
import { AssessmentResultPage } from './components/pages/AssessmentResultPage';
import { VerificationPage } from './components/pages/VerificationPage';
import { KnowledgeDecayPage } from './components/pages/KnowledgeDecayPage';
import { IgotIntegrationPage } from './components/pages/IgotIntegrationPage';
import { ProfilePage } from './components/pages/ProfilePage';
import { StudyMaterialPage } from './components/pages/StudyMaterialPage';
import { DigitalTwinPage } from './components/pages/DigitalTwinPage';
import { TaskReadinessPage } from './components/pages/TaskReadinessPage';
import { AdminAnalyticsPage } from './components/pages/AdminAnalyticsPage';
import { SupervisorDashboardPage } from './components/pages/SupervisorDashboardPage';
import { CareerProgressionPage } from './components/pages/CareerProgressionPage';
import { AiAssistantDrawer } from './components/common/AiAssistantDrawer';
import { AssessmentFinalResult } from './services/assessmentService';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authView, setAuthView] = useState<'intro' | 'login' | 'register'>('intro');
  const [activePage, setActivePage] = useState<NavPageId>('dashboard');
  const [selectedCompetencyId, setSelectedCompetencyId] = useState<string>('');

  // Competencies state
  const [competencies, setCompetencies] = useState<Competency[]>([]);

  // Assessment results state
  const [lastQuizRecords, setLastQuizRecords] = useState<QuizAnswerRecord[] | null>(null);
  const [lastQuizScore, setLastQuizScore] = useState<number>(72);
  const [lastAssessmentResult, setLastAssessmentResult] = useState<AssessmentFinalResult | null>(null);
  const [showingAssessmentResult, setShowingAssessmentResult] = useState<boolean>(false);

  // Modals
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);
  const [showWalkthroughModal, setShowWalkthroughModal] = useState<boolean>(false);
  const [showAssistantDrawer, setShowAssistantDrawer] = useState<boolean>(false);
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const syncLiveDiagnostics = async () => {
    try {
      const diagnostics = await DiagnosticService.getOfficerDiagnostics();
      if (diagnostics && diagnostics.length > 0) {
        setCompetencies((prevComps) =>
          prevComps.map((c) => {
            const diag = diagnostics.find((d) => d.competencyId === c.id);
            if (!diag) return c;
            return {
              ...c,
              score: diag.score,
              gapPoints: diag.gapPoints,
              status: diag.status,
              evidence: diag.evidenceReferences
                ? {
                    assessmentScore: diag.evidenceReferences.assessment_score ?? c.evidence.assessmentScore,
                    quizAccuracy: diag.evidenceReferences.quiz_accuracy ?? c.evidence.quizAccuracy,
                    practicalPerformance: diag.evidenceReferences.practical_performance ?? c.evidence.practicalPerformance,
                    assessmentRatio: diag.evidenceReferences.assessment_ratio ?? c.evidence.assessmentRatio,
                    repeatedErrors: diag.evidenceReferences.repeated_errors ?? c.evidence.repeatedErrors,
                    confidencePattern: diag.evidenceReferences.confidence_pattern ?? c.evidence.confidencePattern,
                  }
                : c.evidence,
              misconceptionId: diag.misconception?.id || c.misconceptionId,
              misconceptionTitle: diag.misconception?.title || c.misconceptionTitle,
              misconceptionExplanation: diag.misconception?.explanation || c.misconceptionExplanation,
            };
          })
        );
      }
    } catch {
      // Keep baseline competencies if backend is offline
    }
  };

  // Check initial login session
  useEffect(() => {
    const user = AuthService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      // Immediate synchronous render from cached state
      const comps = CompetencyService.getCompetencies(user.iGotId);
      setCompetencies(comps);
      // Asynchronously fetch live backend competencies
      CompetencyService.fetchLiveCompetencies(user.iGotId).then((liveComps) => {
        if (liveComps && liveComps.length > 0) {
          setCompetencies(liveComps);
        }
      });
      // Asynchronously revalidate session with backend /api/auth/me
      AuthService.fetchCurrentUser().then((freshUser) => {
        if (freshUser) {
          setCurrentUser(freshUser);
          syncLiveDiagnostics();
        } else {
          setCurrentUser(null);
        }
      });
    }
  }, []);

  const refreshCompetencies = () => {
    if (currentUser) {
      CompetencyService.fetchLiveCompetencies(currentUser.iGotId).then((liveComps) => {
        setCompetencies(liveComps);
        syncLiveDiagnostics();
      });
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const handleLoginSuccess = (user: User, welcomeMsg: string) => {
    setCurrentUser(user);
    const comps = CompetencyService.getCompetencies(user.iGotId);
    setCompetencies(comps);
    syncLiveDiagnostics();
    setActivePage('dashboard');
    showToast(welcomeMsg);
  };

  const handleRegisterSuccess = (msg: string) => {
    setAuthView('login');
    showToast(msg);
  };

  const handleLogoutConfirm = () => {
    AuthService.logout();
    setCurrentUser(null);
    setShowLogoutModal(false);
    setAuthView('login');
    showToast('Logged out successfully.');
  };

  const handleQuizComplete = (
    records: QuizAnswerRecord[],
    score: number,
    finalResult?: AssessmentFinalResult
  ) => {
    setLastQuizRecords(records);
    setLastQuizScore(score);
    setLastAssessmentResult(finalResult || null);
    setShowingAssessmentResult(true);
    syncLiveDiagnostics();
  };

  // If not authenticated, render Intro, Login, or Register
  if (!currentUser) {
    if (authView === 'intro') {
      return <SyncoreeIntroPage onContinue={() => setAuthView('login')} />;
    }
    if (authView === 'register') {
      return (
        <RegisterPage
          onNavigateLogin={() => setAuthView('login')}
          onRegisteredSuccess={handleRegisterSuccess}
        />
      );
    }
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onNavigateRegister={() => setAuthView('register')}
        onNavigateIntro={() => setAuthView('intro')}
      />
    );
  }

  // Selected competency object
  const selectedCompetency =
    competencies.find((c) => c.id === selectedCompetencyId) ||
    competencies[2] || {
      id: 'comp_regression',
      name: 'Regression',
      category: 'Statistical Modeling',
      description: 'Understanding linear, multiple, and logistic regression models.',
      score: 61,
      requiredScore: 75,
      gapPoints: 14,
      status: 'moderate_gap',
      evidence: {
        assessmentScore: 50,
        assessmentRatio: '4/6 incorrect',
        quizAccuracy: 58,
        practicalPerformance: 62,
        repeatedErrors: 3,
        confidencePattern: 'High confidence + incorrect',
      },
      misconceptionTitle: 'Regression Coefficient Misinterpretation',
      misconceptionExplanation:
        'The officer may be interpreting regression coefficients as direct percentage changes rather than understanding them as the expected change in the dependent variable associated with a one-unit change in the predictor.',
      verification: {
        status: 'Partially Verified',
        quizPassed: true,
        practicalEvidenceVerified: false,
        timeline: [],
      },
      decay: {
        initialScore: 84,
        lastEvaluatedDate: 'March 4, 2026',
        daysSinceLastPractice: 45,
        currentEstimatedRetention: 71,
        status: 'Refresh Recommended',
        nextRefreshDays: 5,
        curvePoints: [],
      },
    };

  return (
    <AccessibilityProvider>
    <div className="min-h-screen bg-[#F5EFE6] flex flex-col font-sans">
      {/* Global Header */}
      <Header
        user={currentUser}
        activePage={activePage}
        onOpenWalkthrough={() => setShowWalkthroughModal(true)}
        onOpenAssistant={() => setShowAssistantDrawer(true)}
        onOpenLogout={() => setShowLogoutModal(true)}
        onToggleMobileNav={() => setMobileNavOpen((prev) => !prev)}
      />

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex gap-6">
        {/* Left Nav Sidebar */}
        <Sidebar
          activePage={activePage}
          onNavigate={(page) => {
            setShowingAssessmentResult(false);
            setActivePage(page);
          }}
          onOpenLogout={() => setShowLogoutModal(true)}
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
        />

        {/* Dynamic Center Page Content */}
        <main className="flex-1 min-w-0">
          {/* Toast Notification */}
          {toastMessage && (
            <div className="mb-4 p-3.5 rounded-xl bg-[#3A2921] text-[#F8F3EB] text-xs font-semibold shadow-lg flex items-center justify-between gap-3 animate-fadeIn border border-[#4D3628]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#547A5A] animate-ping"></span>
                <span>{toastMessage}</span>
              </div>
              <button
                onClick={() => setToastMessage(null)}
                className="text-xs text-[#CBB9A7] hover:text-[#F8F3EB] cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {activePage === 'dashboard' && (
            <DashboardPage
              user={currentUser}
              competencies={competencies}
              onNavigate={(page) => {
                setShowingAssessmentResult(false);
                setActivePage(page);
              }}
              onSelectCompetency={(id) => setSelectedCompetencyId(id)}
              onOpenAssistant={() => setShowAssistantDrawer(true)}
            />
          )}

          {activePage === 'competency-map' && (
            <CompetencyMapPage
              competencies={competencies}
              onSelectCompetency={(id) => setSelectedCompetencyId(id)}
              onNavigate={(page) => {
                setShowingAssessmentResult(false);
                setActivePage(page);
              }}
            />
          )}

          {activePage === 'gap-analysis' && (
            <CompetencyDetailPage
              competency={selectedCompetency}
              allCompetencies={competencies}
              onSelectCompetency={(id) => setSelectedCompetencyId(id)}
              onNavigate={(page) => {
                setShowingAssessmentResult(false);
                setActivePage(page);
              }}
            />
          )}

          {activePage === 'digital-twin' && (
            <DigitalTwinPage
              onNavigate={(page) => {
                setShowingAssessmentResult(false);
                setActivePage(page as NavPageId);
              }}
              onSelectCompetency={(id) => {
                setSelectedCompetencyId(id);
                setActivePage('competency-detail');
              }}
            />
          )}

          {activePage === 'why-gap' && (
            <WhyGapPage
              competency={selectedCompetency}
              onNavigate={(page) => {
                setShowingAssessmentResult(false);
                setActivePage(page);
              }}
            />
          )}

          {activePage === 'misconception-library' && (
            <MisconceptionLibraryPage
              onNavigate={(page) => {
                setShowingAssessmentResult(false);
                setActivePage(page);
              }}
            />
          )}

          {activePage === 'learning' && (
            <PersonalizedLearningPage
              userId={currentUser.iGotId}
              onNavigate={(page) => {
                setShowingAssessmentResult(false);
                setActivePage(page);
              }}
            />
          )}

          {activePage === 'assessments' &&
            (showingAssessmentResult && lastQuizRecords ? (
              <AssessmentResultPage
                records={lastQuizRecords}
                score={lastQuizScore}
                finalResult={lastAssessmentResult}
                onNavigate={(page) => {
                  setShowingAssessmentResult(false);
                  setActivePage(page);
                }}
                onRetake={() => {
                  setShowingAssessmentResult(false);
                  setLastAssessmentResult(null);
                }}
              />
            ) : (
              <AdaptiveQuizPage
                userId={currentUser.iGotId}
                targetCompetencyId={selectedCompetencyId}
                onQuizComplete={handleQuizComplete}
                onNavigate={(page) => {
                  setShowingAssessmentResult(false);
                  setActivePage(page);
                }}
              />
            ))}

          {activePage === 'verification' && (
            <VerificationPage
              userId={currentUser.iGotId}
              competencies={competencies}
              onRefreshCompetencies={refreshCompetencies}
              onNavigate={(page) => {
                setShowingAssessmentResult(false);
                setActivePage(page);
              }}
            />
          )}

          {activePage === 'knowledge-decay' && (
            <KnowledgeDecayPage
              userId={currentUser.iGotId}
              competencies={competencies}
              onRefreshCompetencies={refreshCompetencies}
              onNavigate={(page) => {
                setShowingAssessmentResult(false);
                setActivePage(page);
              }}
            />
          )}

          {activePage === 'task-readiness' && (
            <TaskReadinessPage
              userId={currentUser.iGotId}
              onNavigate={(page) => {
                setShowingAssessmentResult(false);
                setActivePage(page);
              }}
            />
          )}

          {(activePage === 'igot-integration' || activePage === 'igot') && (
            <IgotIntegrationPage
              user={currentUser}
              competencies={competencies}
              onNavigate={(page) => {
                setShowingAssessmentResult(false);
                setActivePage(page);
              }}
            />
          )}

          {(activePage === 'career-progression' || activePage === 'career') && (
            <CareerProgressionPage
              user={currentUser}
              onNavigateToTraining={(compId) => {
                setShowingAssessmentResult(false);
                if (compId) setSelectedCompetencyId(compId);
                setActivePage('learning');
              }}
              onNavigateToAssessment={(compId) => {
                setShowingAssessmentResult(false);
                if (compId) setSelectedCompetencyId(compId);
                setActivePage('assessments');
              }}
            />
          )}

          {activePage === 'admin-analytics' && (
            <AdminAnalyticsPage
              onNavigate={(page) => {
                setShowingAssessmentResult(false);
                setActivePage(page);
              }}
            />
          )}

          {activePage === 'supervisor-dashboard' && (
            <SupervisorDashboardPage
              onNavigate={(page) => {
                setShowingAssessmentResult(false);
                setActivePage(page);
              }}
            />
          )}

          {activePage === 'study-material' && (
            <StudyMaterialPage
              onNavigate={(page) => {
                setShowingAssessmentResult(false);
                setActivePage(page);
              }}
            />
          )}

          {activePage === 'profile' && (
            <ProfilePage
              user={currentUser}
              competencies={competencies}
              onUserUpdate={(updated) => setCurrentUser(updated)}
            />
          )}
        </main>
      </div>

      {/* Floating AI Assistant Trigger Button */}
      <button
        onClick={() => setShowAssistantDrawer(true)}
        className="fixed bottom-6 right-6 z-40 p-3.5 bg-[#3A2921] hover:bg-[#4D3628] text-[#F8F3EB] rounded-full shadow-2xl border border-[#6B4A35]/60 flex items-center gap-2 transition-all hover:scale-105"
        title="Open AI Statistical Assistant"
        aria-label="Open AI Assistant"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-[#547A5A] animate-pulse" />
        <span className="text-xs font-bold pr-1">Ask AI</span>
      </button>

      {/* AI Assistant Drawer */}
      <AiAssistantDrawer
        isOpen={showAssistantDrawer}
        onClose={() => setShowAssistantDrawer(false)}
        user={currentUser}
        onNavigateToPage={(page) => {
          setShowAssistantDrawer(false);
          setShowingAssessmentResult(false);
          setActivePage(page as NavPageId);
        }}
      />

      {/* Global Modals */}
      <LogoutModal
        isOpen={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={handleLogoutConfirm}
      />

      <DemoWalkthroughModal
        isOpen={showWalkthroughModal}
        onClose={() => setShowWalkthroughModal(false)}
        onJumpToStep={(page, extraAction) => {
          setShowingAssessmentResult(false);
          if (extraAction === 'select_regression') {
            setSelectedCompetencyId('comp_regression');
          }
          setActivePage(page);
        }}
      />
    </div>
    </AccessibilityProvider>
  );
}
