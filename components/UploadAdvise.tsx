
import React, { useState } from 'react';
import { Page, ExtractedData } from '../types';
import { extractDataFromAdvise } from '../services/geminiService';

interface UploadAdviseProps {
  navigate: (page: Page) => void;
  onExtractionComplete: (data: ExtractedData) => void;
}

const Spinner: React.FC = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


const UploadAdvise: React.FC<UploadAdviseProps> = ({ navigate, onExtractionComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
          setError("File size cannot exceed 10MB.");
          return;
      }
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setError('');
    }
  };

  const handleProcessFile = async () => {
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await extractDataFromAdvise(file);
      onExtractionComplete(data);
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg text-center">
      <h2 className="text-3xl font-bold text-gray-900">Upload Payment Advise</h2>
      <p className="mt-2 text-gray-600">Let AI pre-fill the form for you. Supports PDF, JPG, and PNG files.</p>
      
      <div className="mt-8">
        <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
          <div className="space-y-1 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="flex text-sm text-gray-600">
              <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                <span>Upload a file</span>
                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="application/pdf,image/jpeg,image/png" />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">PDF, PNG, JPG up to 10MB</p>
          </div>
        </div>
        {fileName && <p className="mt-4 text-sm text-gray-700">Selected file: <span className="font-medium">{fileName}</span></p>}
      </div>

      {error && <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">{error}</div>}

      <div className="mt-8 flex items-center justify-end gap-x-6">
        <button type="button" onClick={() => navigate('DASHBOARD')} className="text-sm font-semibold leading-6 text-gray-900">
          Cancel
        </button>
        <button
          type="button"
          onClick={handleProcessFile}
          disabled={!file || loading}
          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:bg-gray-400"
        >
          {loading && <Spinner />}
          {loading ? 'Analyzing Document...' : 'Process and Fill Form'}
        </button>
      </div>
    </div>
  );
};

export default UploadAdvise;
