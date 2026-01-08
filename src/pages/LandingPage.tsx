import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12">
      <div className="max-w-2xl w-full space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-6">
          {/* Logo and Brand */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <img 
              src="/logo.png" 
              alt="MetaMindful" 
              className="h-16 w-auto"
            />
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white">
              MetaMindful
            </h1>
          </div>
          
          {/* Tagline */}
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 font-normal">
            Your AI companion for mental wellness
          </p>
          
          {/* Description */}
          <p className="text-base md:text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto mt-4">
            Begin your journey towards better mental health with personalized support and guidance.
          </p>
        </div>

        {/* Action Buttons Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-10 space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              Choose a log-in method
            </h2>
          </div>

          <div className="space-y-3">
            <Link
              to="/"
              className="w-full block text-center rounded-xl bg-yellow-400 hover:bg-yellow-500 px-6 py-4 text-base font-semibold text-gray-800 transition-colors duration-200 shadow-sm"
            >
              Log In
            </Link>

            <Link
              to="/signup"
              className="w-full block text-center rounded-xl border-2 border-yellow-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 px-6 py-4 text-base font-semibold text-gray-800 dark:text-gray-200 transition-colors duration-200"
            >
              Sign Up
            </Link>

            <Link
              to="/guest"
              className="w-full block text-center rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 px-6 py-4 text-base font-semibold text-gray-800 dark:text-gray-200 transition-colors duration-200"
            >
              Continue as Guest
            </Link>
          </div>
        </div>

        {/* Additional Info */}
        <div className="text-center space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Start your wellness journey today. No account required to get started.
          </p>
        </div>
      </div>
    </div>
  );
}



