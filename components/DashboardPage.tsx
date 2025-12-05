import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, FormSubmission } from "../types";

interface DashboardPageProps {
  user: User;
  onLogout: () => void;
}

const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || typeof amount === "undefined") {
    return "N/A";
  }
  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const SubmissionDetailsModal: React.FC<{
  submission: FormSubmission;
  onClose: () => void;
}> = ({ submission, onClose }) => {
  return (
    <div
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
      onClick={onClose}
    >
      <div
        className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="text-2xl font-bold text-gray-900">
            Submission Details
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="mt-4 max-h-[70vh] overflow-y-auto pr-4 space-y-6">
          {/* Header Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <strong>Reference ID:</strong>{" "}
              <span className="text-gray-700">{submission.id}</span>
            </div>
            <div>
              <strong>Submitted At:</strong>{" "}
              <span className="text-gray-700">
                {new Date(submission.submittedAt).toLocaleString()}
              </span>
            </div>
            <div>
              <strong>Invoice Type:</strong>{" "}
              <span className="text-gray-700">{submission.invoiceType}</span>
            </div>
            <div>
              <strong>Entity:</strong>{" "}
              <span className="text-gray-700">{submission.entityCode}</span>
            </div>
            <div>
              <strong>Bank Account (GL):</strong>{" "}
              <span className="text-gray-700">{submission.bankAccount}</span>
            </div>
            {submission.customerCode && (
              <div>
                <strong>Customer Code:</strong>{" "}
                <span className="text-gray-700">{submission.customerCode}</span>
              </div>
            )}
            {submission.customerName && (
              <div>
                <strong>Customer Name:</strong>{" "}
                <span className="text-gray-700">{submission.customerName}</span>
              </div>
            )}
            {submission.divisionCode && (
              <div>
                <strong>Division Code:</strong>{" "}
                <span className="text-gray-700">{submission.divisionCode}</span>
              </div>
            )}
            {submission.caseType && (
              <div>
                <strong>Case Type:</strong>{" "}
                <span className="text-gray-700">{submission.caseType}</span>
              </div>
            )}
            {submission.creditControlArea && (
              <div>
                <strong>Credit Control Area:</strong>{" "}
                <span className="text-gray-700">
                  {submission.creditControlArea}
                </span>
              </div>
            )}
            {submission.profitCenter && (
              <div>
                <strong>Profit Center:</strong>{" "}
                <span className="text-gray-700">{submission.profitCenter}</span>
              </div>
            )}
            {submission.remark && (
              <div className="col-span-full">
                <strong>Remark:</strong>{" "}
                <p className="text-gray-700 mt-1 p-2 bg-gray-50 rounded-md">
                  {submission.remark}
                </p>
              </div>
            )}
          </div>

          {/* Payment Details */}
          {submission.paymentDetails && (
            <div>
              <h4 className="text-lg font-semibold text-gray-800 border-t pt-4 mt-4">
                Payment Details
              </h4>
              <ul className="divide-y divide-gray-200 mt-2">
                {submission.paymentDetails.map((p, idx) => (
                  <li
                    key={p.id || idx}
                    className="py-2 grid grid-cols-3 gap-4 text-sm"
                  >
                    <div>
                      <strong>Ref:</strong> {p.bankReferenceNumber}
                    </div>
                    <div>
                      <strong>Amount:</strong> {formatCurrency(p.amount)}
                    </div>
                    <div>
                      <strong>Date:</strong> {p.paymentDate}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Invoice Details */}
          {submission.invoiceDetails &&
            submission.invoiceDetails.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-gray-800 border-t pt-4 mt-4">
                  Invoice Details
                </h4>
                <ul className="divide-y divide-gray-200 mt-2">
                  {submission.invoiceDetails.map((i, idx) => (
                    <li
                      key={i.id || idx}
                      className="py-2 grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-4 text-sm"
                    >
                      <div>
                        <strong>Invoice #:</strong> {i.invoiceNumber}
                      </div>
                      <div>
                        <strong>Invoice Amt:</strong>{" "}
                        {formatCurrency(i.invoiceAmount)}
                      </div>
                      <div>
                        <strong>Amt Paid:</strong>{" "}
                        {formatCurrency(i.invoiceAmountPaid)}
                      </div>
                      <div>
                        <strong>TDS Amount:</strong>{" "}
                        {formatCurrency(i.tdsAmount)}
                      </div>
                      <div>
                        <strong>GST Withheld:</strong>{" "}
                        {formatCurrency(i.gstWithheldAmount)}
                      </div>
                      <div>
                        <strong>Amt Deducted:</strong>{" "}
                        {formatCurrency(i.invoiceAmountDeducted)}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </div>
        <div className="mt-6 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const DashboardPage: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const [selectedSubmission, setSelectedSubmission] =
    useState<FormSubmission | null>(null);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/forms", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401 || res.status === 403) {
          onLogout();
          return;
        }

        if (res.ok) {
          const data = await res.json();
          setSubmissions(data);
        }
      } catch (err) {
        console.error("Failed to load submissions", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubmissions();
  }, [onLogout]);

  return (
    <>
      {selectedSubmission && (
        <SubmissionDetailsModal
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
        />
      )}
      <div className="space-y-8">
        <div className="p-8 bg-white rounded-xl shadow-lg">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {user.email.split("@")[0]}!
          </h1>
          <p className="mt-2 text-gray-600">
            Choose an option below to start linking payments to invoices.
          </p>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              onClick={() => navigate("/form")}
              className="group relative p-6 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer transition-all duration-300 transform hover:scale-105"
            >
              <div className="flex items-center">
                <div className="p-3 bg-blue-200 rounded-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-blue-700"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <h2 className="text-xl font-semibold text-gray-800">
                    Fill Payment Form
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Manually enter payment and invoice details.
                  </p>
                </div>
              </div>
            </div>
            <div
              onClick={() => navigate("/upload")}
              className="group relative p-6 bg-green-50 rounded-lg hover:bg-green-100 cursor-pointer transition-all duration-300 transform hover:scale-105"
            >
              <div className="flex items-center">
                <div className="p-3 bg-green-200 rounded-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-green-700"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <h2 className="text-xl font-semibold text-gray-800">
                    Upload Payment Advise
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Let AI extract data from your PDF or image file.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 bg-white rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900">Your Submissions</h2>
          <div className="mt-4 flow-root">
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                {isLoading ? (
                  <div className="text-center py-10 text-gray-500">
                    Loading submissions...
                  </div>
                ) : submissions.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead>
                      <tr>
                        <th
                          scope="col"
                          className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0"
                        >
                          Reference ID
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                        >
                          Type
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                        >
                          Customer
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                        >
                          Submitted At
                        </th>
                        <th
                          scope="col"
                          className="relative py-3.5 pl-3 pr-4 sm:pr-0"
                        >
                          <span className="sr-only">View</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {submissions.map((sub) => (
                        <tr key={sub.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                            {sub.id}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {sub.invoiceType}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {sub.customerName || "N/A"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {new Date(sub.submittedAt).toLocaleString()}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                            <button
                              onClick={() => setSelectedSubmission(sub)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-10">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                      />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      No submissions yet
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Get started by filling a form or uploading a document.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardPage;
