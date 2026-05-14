import { Navigate, Route, Routes } from "react-router-dom";
import { TemplateDetailPage } from "./pages/TemplateDetailPage";
import { TemplateListPage } from "./pages/TemplateListPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<TemplateListPage />} />
      <Route path="/template/:id" element={<TemplateDetailPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
