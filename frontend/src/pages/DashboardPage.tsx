import { useAuth } from '../context/AuthContext'
import PageTitle from '../components/ui/PageTitle'

export default function DashboardPage() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl text-indigo-600 dark:text-indigo-400 font-bold">
            {user?.email?.[0].toUpperCase()}
          </span>
        </div>
        <PageTitle className="text-xl mb-1">¡Bienvenido!</PageTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 break-all">
          {user?.email}
        </p>
        <button
          onClick={signOut}
          className="w-full py-2.5 px-4 border border-gray-300 dark:border-gray-600
                     text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg
                     hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150
                     focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
