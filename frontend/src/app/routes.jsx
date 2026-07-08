import { Routes, Route } from 'react-router-dom';
import UploadWorkspace from '@/features/upload/UploadWorkspace';
import DocumentDetailsWorkspace from '@/features/document-details/DocumentDetailsWorkspace';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<UploadWorkspace />} />
      <Route path="/documents/:id" element={<DocumentDetailsWorkspace />} />
    </Routes>
  );
}
