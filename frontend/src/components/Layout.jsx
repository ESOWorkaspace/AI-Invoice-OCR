import Navbar from './Navbar'

export default function Layout({ children }) {
  return (
    <div className="min-h-svh w-screen bg-white flex flex-col">
      <Navbar />
      <div className="flex-1 w-full">
        {children}
      </div>
      <footer className="w-full text-center py-4 bg-black">
        <hr className="mb-4 border-blue-100" />
        Made with Passion &copy; <span>{new Date().getFullYear()}</span> by ONIGIRI | Upload multiple files and preview them using the navigation controls
      </footer>
    </div>
  )
}
