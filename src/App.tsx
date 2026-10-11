import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { lazy, Suspense, useEffect, useState, useRef } from "react";
import CacheNotice from "./components/CacheNotice";
import OfflineStatus from "./components/OfflineStatus";
import { backend, authReturnKind } from "./account/client";
import HomePage from "./pages/HomePage";
const TemplateSelectPage = lazy(() => import("./pages/TemplateSelectPage"));
const EditorPage = lazy(() => import("./pages/EditorPage"));
const PreviewPage = lazy(() => import("./pages/PreviewPage"));
import SavedCvsPage from "./pages/SavedCvsPage";
import SettingsPage from "./pages/SettingsPage";
const CoverLetterPage = lazy(() => import("./pages/CoverLetterPage"));

const CustomDesignPage = lazy(() => import("./pages/CustomDesignPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const ImportPage = lazy(() => import("./pages/ImportPage"));
const WorkspacePage = lazy(() => import("./pages/WorkspacePage"));

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const returnHandled = useRef(false);
  const [dataRevision, setDataRevision] = useState(0);
  useEffect(() => {
    const restored = () => setDataRevision((v) => v + 1);
    window.addEventListener("medico:data-restored", restored);
    const routeReturn = (kind: string | null) => {
      if (!kind) return;
      const url = new URL(window.location.href);
      url.searchParams.delete("auth");
      history.replaceState(null, "", url.pathname + url.search + url.hash);
      navigate(
        kind === "reset" || kind === "recovery"
          ? "/reset-password"
          : "/account",
        { replace: true },
      );
    };
    if (authReturnKind && !returnHandled.current) {
      returnHandled.current = true;
      void backend.auth.getSession().then(() => routeReturn(authReturnKind));
    }
    const {
      data: { subscription },
    } = backend.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") routeReturn("reset");
    });
    return () => {
      window.removeEventListener("medico:data-restored", restored);
      subscription.unsubscribe();
    };
  }, [navigate]);
  useEffect(() => {
    let referred = true;
    try {
      referred = Boolean(localStorage.getItem("medico:referral"));
    } catch {}
    window.MedCVAndroid?.setAdPlacement?.(location.pathname, referred);
  }, [location.pathname]);
  return (
    <div className="app-shell">
      <OfflineStatus />
      <Suspense
        key={dataRevision}
        fallback={
          <p role="status" className="container">
            Opening your workspace…
          </p>
        }
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/new" element={<TemplateSelectPage />} />
          <Route path="*" element={<HomePage />} />
          <Route path="/template/:cvId" element={<TemplateSelectPage />} />
          <Route path="/editor/:cvId" element={<EditorPage />} />
          <Route path="/preview/:cvId" element={<PreviewPage />} />
          <Route path="/saved" element={<SavedCvsPage />} />
          <Route path="/cover-letter" element={<CoverLetterPage />} />
          <Route path="/workspace" element={<WorkspacePage />} />
          <Route path="/design" element={<CustomDesignPage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />
          <Route path="/verify-email" element={<AuthPage mode="verify" />} />
          <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
          <Route path="/reset-password" element={<AuthPage mode="reset" />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Suspense>
      <CacheNotice />
    </div>
  );
}
