import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import OCRPage from './pages/OCRPage'

function App() {
  return (
    <Layout>
      <Toaster position="top-right" />
      <OCRPage />
    </Layout>
  )
}

export default App