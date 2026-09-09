import { Route, Routes } from "react-router-dom";
import { lazy, Suspense } from 'react';
import HomePage from "./pages/HomePage";
const TemplateSelectPage = lazy(()=>import('./pages/TemplateSelectPage'));
const EditorPage = lazy(()=>import('./pages/EditorPage'));
const PreviewPage = lazy(()=>import('./pages/PreviewPage'));
import SavedCvsPage from "./pages/SavedCvsPage";
import SettingsPage from "./pages/SettingsPage";
const CoverLetterPage = lazy(()=>import('./pages/CoverLetterPage'));

export default function App() {
  return (
    <div className="app-shell">
      <Suspense fallback={<p role="status" className="container">Opening your workspace…</p>}><Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/new" element={<TemplateSelectPage />} />
        <Route path="*" element={<HomePage />} />
        <Route path="/template/:cvId" element={<TemplateSelectPage />} />
        <Route path="/editor/:cvId" element={<EditorPage />} />
        <Route path="/preview/:cvId" element={<PreviewPage />} />
        <Route path="/saved" element={<SavedCvsPage />} />
        <Route path="/cover-letter" element={<CoverLetterPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes></Suspense>
    </div>
  );
}
