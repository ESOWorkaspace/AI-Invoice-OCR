export default function Layout({ children }) {
  return (
    <div className="min-h-svh w-screen bg-white flex flex-col">
      <div className="flex-1 w-full">
        {children}
      </div>
      <footer className="w-full text-center py-4 bg-black">
        <hr className="mb-4 border-blue-100" />
        Made with Passion © <span>{new Date().getFullYear()}</span> by ONIGIRI | Upload multiple files and preview them using the navigation controls
      </footer>
    </div>
  )
}
