import { Routes, Route } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import Dashboard from "@/pages/Dashboard";
import SearchPage from "@/pages/SearchPage";
import Partners from "@/pages/Partners";
import PartnerDetail from "@/pages/PartnerDetail";
import ServicesDirectory from "@/pages/ServicesDirectory";
import VerificationQueue from "@/pages/VerificationQueue";
import UploadArchive from "@/pages/UploadArchive";
import SettingsPage from "@/pages/SettingsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/partners" element={<Partners />} />
        <Route path="/partners/:partnerId" element={<PartnerDetail />} />
        <Route path="/services" element={<ServicesDirectory />} />
        <Route path="/verification" element={<VerificationQueue />} />
        <Route path="/upload" element={<UploadArchive />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
