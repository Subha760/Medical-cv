import { Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ProfessionSelectPage from "./pages/ProfessionSelectPage";
import TemplateSelectPage from "./pages/TemplateSelectPage";
import EditorPage from "./pages/EditorPage";
import PreviewPage from "./pages/PreviewPage";
import SavedCvsPage from "./pages/SavedCvsPage";
import SettingsPage from "./pages/SettingsPage";
import CoverLetterPage from "./pages/CoverLetterPage";

export default function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/new" element={<ProfessionSelectPage />} />
        <Route path="/template/:cvId" element={<TemplateSelectPage />} />
        <Route path="/editor/:cvId" element={<EditorPage />} />
        <Route path="/preview/:cvId" element={<PreviewPage />} />
        <Route path="/saved" element={<SavedCvsPage />} />
        <Route path="/cover-letter" element={<CoverLetterPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </div>
  );
}
