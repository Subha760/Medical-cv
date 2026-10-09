import { Route, Routes, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import CacheNotice from "./components/CacheNotice";
import OfflineStatus from "./components/OfflineStatus";
import HomePage from "./pages/HomePage";
const TemplateSelectPage = lazy(() => import("./pages/TemplateSelectPage"));
const EditorPage = lazy(() => import("./pages/EditorPage"));
const PreviewPage = lazy(() => import("./pages/PreviewPage"));
import SavedCvsPage from "./pages/SavedCvsPage";
import SettingsPage from "./pages/SettingsPage";
const CoverLetterPage = lazy(() => import("./pages/CoverLetterPage"));

const CustomDesignPage = lazy(() => import("./pages/CustomDesignPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const ImportPage = lazy(() => import("./pages/ImportPage"));
const WorkspacePage = lazy(() => import("./pages/WorkspacePage"));

export default function App() {
  const location = useLocation();
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
          <Route path="/account" element={<AccountPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Suspense>
      <CacheNotice />
    </div>
  );
}
