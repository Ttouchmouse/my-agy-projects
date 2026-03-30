import { Toaster } from 'react-hot-toast';
import { DashboardLayout } from './components/layout/DashboardLayout.tsx';
import { useGlobalImageUpload } from './hooks/useGlobalImageUpload.ts';

function App() {
  useGlobalImageUpload({ registerPasteListener: true }); // 활성화 (전역 복붙 리스너 등)

  return (
    <>
      <Toaster position="top-center" />
      <DashboardLayout />
    </>
  );
}

export default App;
