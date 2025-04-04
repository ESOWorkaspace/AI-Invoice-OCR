import { Toaster } from 'react-hot-toast'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import OCRPage from './pages/OCRPage'
import HistoryPage from './pages/HistoryPage'
import InvoicesPage from './pages/database/InvoicesPage'
import DatabaseManagePage from './pages/database/DatabaseManagePage'
import ProductsPage from './pages/database/ProductsPage'

function App() {
  return (
    <Router>
      <Layout>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<OCRPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/database/invoices" element={<InvoicesPage />} />
          <Route path="/database/manage" element={<DatabaseManagePage />} />
          <Route path="/database/products" element={<ProductsPage />} />
          <Route path="/database/*" element={<div className="p-8 text-center">Database Management (Coming Soon)</div>} />
          <Route path="/settings/*" element={<div className="p-8 text-center">Settings (Coming Soon)</div>} />
          <Route path="/help" element={<div className="p-8 text-center">Help & Documentation (Coming Soon)</div>} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App