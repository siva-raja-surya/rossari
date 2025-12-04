
import React, { useState, useCallback } from 'react';
import LoginPage from './components/LoginPage';
import DashboardPage from './components/DashboardPage';
import PaymentForm from './components/PaymentForm';
import UploadAdvise from './components/UploadAdvise';
import { Page, User, FormSubmission, ExtractedData } from './types';
import { MOCK_USER } from './constants';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('DASHBOARD');
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [editingSubmission, setEditingSubmission] = useState<FormSubmission | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);

  const handleLogin = () => {
    setUser(MOCK_USER);
    setCurrentPage('DASHBOARD');
  };

  const handleLogout = () => {
    setUser(null);
  };

  const navigate = (page: Page) => {
    setExtractedData(null); // Clear any extracted data on navigation
    setEditingSubmission(null);
    setCurrentPage(page);
  };

  const handleFormSubmit = useCallback((submission: FormSubmission) => {
    setSubmissions(prev => [...prev, submission]);
    setCurrentPage('DASHBOARD');
  }, []);

  const handleExtractedData = (data: ExtractedData) => {
    setExtractedData(data);
    setCurrentPage('FORM');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'DASHBOARD':
        return <DashboardPage user={user!} navigate={navigate} submissions={submissions} />;
      case 'FORM':
        return <PaymentForm
                  onSubmit={handleFormSubmit}
                  navigate={navigate}
                  initialData={extractedData}
                />;
      case 'UPLOAD':
        return <UploadAdvise navigate={navigate} onExtractionComplete={handleExtractedData} />;
      default:
        return <DashboardPage user={user!} navigate={navigate} submissions={submissions} />;
    }
  };

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      <header className="bg-white shadow-md">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-bold text-xl ml-2">AR AI Assistant</span>
            </div>
            <div className="flex items-center space-x-4">
               <span className="text-gray-600">Welcome, {user.email}</span>
               <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Logout
              </button>
            </div>
          </div>
        </nav>
      </header>
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        {renderPage()}
      </main>
    </div>
  );
};

export default App;
