import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  InvoiceType,
  PaymentDetail,
  InvoiceDetail,
  FormSubmission,
  ExtractedData,
  Entity,
  Division,
  BankAccount,
} from "../types";
import { CUSTOMERS } from "../constants"; // Keeping customers static for now as per instruction, only removed requested fields

interface PaymentFormProps {
  // Props are now largely handled by Router state/Location
}

interface ProfitCenter {
  code: string;
  entityCode: string;
}

const formatCurrency = (amount: number): string => {
  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const PaymentForm: React.FC<PaymentFormProps> = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Retrieve initial data passed from UploadAdvise via router state
  const initialData = location.state?.initialData as ExtractedData | undefined;

  // Master Data State
  const [masterEntities, setMasterEntities] = useState<Entity[]>([]);
  const [masterDivisions, setMasterDivisions] = useState<Division[]>([]);
  const [masterBankAccounts, setMasterBankAccounts] = useState<BankAccount[]>(
    []
  );
  const [masterCreditControlAreas, setMasterCreditControlAreas] = useState<
    string[]
  >([]);
  const [masterProfitCenters, setMasterProfitCenters] = useState<
    ProfitCenter[]
  >([]);
  const [isLoadingMasterData, setIsLoadingMasterData] = useState(true);

  const [invoiceType, setInvoiceType] = useState<InvoiceType>(
    InvoiceType.SPECIFIC
  );
  const [customerCode, setCustomerCode] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [entityCode, setEntityCode] = useState("");
  const [divisionCode, setDivisionCode] = useState("");
  const [caseType, setCaseType] = useState<
    "Domestic" | "Import" | "Export" | ""
  >("");
  const [bankAccount, setBankAccount] = useState("");
  const [creditControlArea, setCreditControlArea] = useState("");
  const [profitCenter, setProfitCenter] = useState("");
  const [remark, setRemark] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [paymentDetails, setPaymentDetails] = useState<PaymentDetail[]>([
    {
      id: crypto.randomUUID(),
      bankReferenceNumber: "",
      amount: null,
      paymentDate: new Date().toISOString().split("T")[0],
    },
  ]);
  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetail[]>([
    {
      id: crypto.randomUUID(),
      invoiceNumber: "",
      invoiceAmount: null,
      invoiceAmountPaid: null,
      tdsAmount: null,
      gstWithheldAmount: null,
      invoiceAmountDeducted: null,
    },
  ]);

  const [customerCodeError, setCustomerCodeError] = useState("");

  const dataFetchedRef = useRef(false);

  // Fetch Master Data
  useEffect(() => {
    if (dataFetchedRef.current) return;
    dataFetchedRef.current = true;

    const fetchMasterData = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/master-data", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setMasterEntities(data.entities);
          setMasterDivisions(data.divisions);
          setMasterBankAccounts(data.bankAccounts);
          setMasterCreditControlAreas(data.creditControlAreas);
          setMasterProfitCenters(data.profitCenters);
        }
      } catch (error) {
        console.error("Failed to load master data", error);
        setFormError("Failed to load form options. Please reload the page.");
      } finally {
        setIsLoadingMasterData(false);
      }
    };

    fetchMasterData();
  }, []);

  useEffect(() => {
    if (initialData) {
      setInvoiceType(initialData.invoiceType || InvoiceType.SPECIFIC);
      setCustomerCode(initialData.customerCode || "");
      setCustomerName(initialData.customerName || "");
      setEntityCode(initialData.entityCode || "");
      setDivisionCode(initialData.divisionCode || "");
      setCaseType(initialData.caseType || "");
      setBankAccount(initialData.bankAccount || "");
      setCreditControlArea(initialData.creditControlArea || "");
      setProfitCenter(initialData.profitCenter || "");
      setRemark(initialData.remark || "");

      // Auto-select entity based on bank account
      if (initialData.bankAccount && masterBankAccounts.length > 0) {
        const matchedAccount = masterBankAccounts.find(
          (acc) =>
            acc.name.toLowerCase() === initialData.bankAccount!.toLowerCase() ||
            acc.glCode === initialData.bankAccount
        );
        if (matchedAccount) {
          setEntityCode(matchedAccount.entityCode);
          setBankAccount(matchedAccount.glCode);
        }
      }

      if (initialData.paymentDetails && initialData.paymentDetails.length > 0) {
        setPaymentDetails(initialData.paymentDetails);
      }
      if (initialData.invoiceDetails && initialData.invoiceDetails.length > 0) {
        setInvoiceDetails(initialData.invoiceDetails);
      }
    }
  }, [initialData, masterBankAccounts]);

  useEffect(() => {
    if (customerCode.length === 8) {
      const customer = CUSTOMERS.find((c) => c.code === customerCode);
      if (customer) {
        setCustomerName(customer.name);
        setCustomerCodeError("");
      } else {
        setCustomerName("");
        setCustomerCodeError("Invalid customer code.");
      }
    } else {
      setCustomerName("");
      setCustomerCodeError(""); // Clear error for partial/empty input
    }
  }, [customerCode]);

  const invoiceTotals = useMemo(() => {
    const safeSum = (arr: InvoiceDetail[], key: keyof InvoiceDetail) =>
      arr.reduce((acc, item) => acc + (Number(item[key]) || 0), 0);

    return {
      count: invoiceDetails.length,
      totalInvoiceAmount: safeSum(invoiceDetails, "invoiceAmount"),
      totalInvoiceAmountPaid: safeSum(invoiceDetails, "invoiceAmountPaid"),
      totalTdsAmount: safeSum(invoiceDetails, "tdsAmount"),
      totalGstWithheld: safeSum(invoiceDetails, "gstWithheldAmount"),
      totalInvoiceAmountDeducted: safeSum(
        invoiceDetails,
        "invoiceAmountDeducted"
      ),
    };
  }, [invoiceDetails]);

  const handleDetailChange = <T,>(
    id: string,
    field: keyof T,
    value: any,
    setter: React.Dispatch<React.SetStateAction<T[]>>
  ) => {
    setter((prev) =>
      prev.map((item) =>
        (item as any).id === id ? { ...item, [field]: value } : item
      )
    );
    const errorKey = `${id}-${String(field)}`;
    if (fieldErrors[errorKey]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  const addDetail = <T,>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    newDetail: T
  ) => {
    setter((prev) => [...prev, newDetail]);
  };

  const removeDetail = <T,>(
    id: string,
    setter: React.Dispatch<React.SetStateAction<T[]>>
  ) => {
    setter((prev) => prev.filter((item) => (item as any).id !== id));
  };

  const isCustomerRequired =
    invoiceType === InvoiceType.ADVANCE ||
    invoiceType === InvoiceType.OUTSTANDING;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    let hasError = false;
    const newFieldErrors: Record<string, string> = {};

    // 1. Top Level Validation
    if (!entityCode) {
      newFieldErrors["entityCode"] = "Entity Code is required";
      hasError = true;
    }
    if (!bankAccount) {
      newFieldErrors["bankAccount"] = "Bank Account is required";
      hasError = true;
    }

    if (isCustomerRequired) {
      if (customerCode.length !== 8) {
        newFieldErrors["customerCode"] = "Customer code must be 8 digits.";
        hasError = true;
      } else if (customerCodeError) {
        newFieldErrors["customerCode"] = customerCodeError;
        hasError = true;
      }
    }

    // 2. Payment Details Validation
    const bankRefRegex = /^[a-zA-Z0-9]{10,22}$/;

    paymentDetails.forEach((p) => {
      const ref = p.bankReferenceNumber?.trim() || "";
      if (!ref) {
        newFieldErrors[`${p.id}-bankReferenceNumber`] = "Required";
        hasError = true;
      } else if (!bankRefRegex.test(ref)) {
        newFieldErrors[`${p.id}-bankReferenceNumber`] =
          "Must be 10-22 alphanumeric characters.";
        hasError = true;
      }

      if (p.amount === null || p.amount === undefined) {
        newFieldErrors[`${p.id}-amount`] = "Required";
        hasError = true;
      }
    });

    if (invoiceType === InvoiceType.SPECIFIC) {
      // 3. Invoice Details Validation
      const seenInvoices = new Map<string, string[]>();

      invoiceDetails.forEach((i) => {
        const num = i.invoiceNumber?.trim() || "";

        if (!num) {
          newFieldErrors[`${i.id}-invoiceNumber`] = "Required";
          hasError = true;
        } else {
          const isAlphanumeric = /^[a-zA-Z0-9]+$/.test(num);
          const isOnlyAlphabets = /^[a-zA-Z]+$/.test(num);
          if (!isAlphanumeric || isOnlyAlphabets) {
            newFieldErrors[`${i.id}-invoiceNumber`] =
              "Must be alphanumeric (not only alphabets).";
            hasError = true;
          }

          const normalized = num.toLowerCase();
          if (!seenInvoices.has(normalized)) seenInvoices.set(normalized, []);
          seenInvoices.get(normalized)!.push(i.id);
        }

        if (i.invoiceAmount === null || i.invoiceAmount === undefined) {
          newFieldErrors[`${i.id}-invoiceAmount`] = "Required";
          hasError = true;
        }
      });

      seenInvoices.forEach((ids, _) => {
        if (ids.length > 1) {
          ids.forEach((id) => {
            newFieldErrors[`${id}-invoiceNumber`] = "Duplicate Invoice Number";
          });
          hasError = true;
        }
      });

      // 4. Cross-Field Validation
      const bankRefs = new Set(
        paymentDetails
          .map((p) => p.bankReferenceNumber?.trim().toLowerCase())
          .filter(Boolean)
      );

      invoiceDetails.forEach((i) => {
        const num = i.invoiceNumber?.trim().toLowerCase();
        if (num && bankRefs.has(num)) {
          newFieldErrors[`${i.id}-invoiceNumber`] = "Cannot match Bank Ref";
          paymentDetails.forEach((p) => {
            if (p.bankReferenceNumber?.trim().toLowerCase() === num) {
              newFieldErrors[`${p.id}-bankReferenceNumber`] =
                "Cannot match Invoice #";
            }
          });
          hasError = true;
        }
      });

      // 5. Total Amount Check
      const totalPaymentAmount = paymentDetails.reduce(
        (sum, p) => sum + (Number(p.amount) || 0),
        0
      );

      if (
        Math.abs(totalPaymentAmount - invoiceTotals.totalInvoiceAmountPaid) >
        0.01
      ) {
        setFormError(
          `Validation Error: Total Payment Amount (${formatCurrency(
            totalPaymentAmount
          )}) must match Total Invoice Amount Paid (${formatCurrency(
            invoiceTotals.totalInvoiceAmountPaid
          )}).`
        );
        hasError = true;
      }
    }

    setFieldErrors(newFieldErrors);

    if (hasError || (formError && formError.length > 0)) {
      if (!formError) {
        setFormError("Please fix the highlighted errors.");
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        invoiceType,
        customerCode: isCustomerRequired ? customerCode : undefined,
        customerName: isCustomerRequired ? customerName : undefined,
        entityCode,
        divisionCode: divisionCode || undefined,
        caseType: caseType || undefined,
        bankAccount,
        creditControlArea: creditControlArea || undefined,
        profitCenter: profitCenter || undefined,
        remark: remark || undefined,
        paymentDetails,
        invoiceDetails:
          invoiceType === InvoiceType.SPECIFIC ? invoiceDetails : undefined,
      };

      const token = localStorage.getItem("token");
      const response = await fetch("/api/forms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Submission failed");
      }

      // On success, navigate back to dashboard
      navigate("/");
    } catch (error: any) {
      setFormError(error.message || "Failed to submit form. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDivisions = entityCode
    ? masterDivisions.filter((d) => d.entityCode === entityCode)
    : [];
  const filteredBankAccounts = entityCode
    ? masterBankAccounts.filter((b) => b.entityCode === entityCode)
    : [];
  const filteredProfitCenters = entityCode
    ? masterProfitCenters.filter((p) => p.entityCode === entityCode)
    : [];

  const getInputClass = (errorKey?: string) => {
    const hasError = errorKey && fieldErrors[errorKey];
    return `mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
      hasError
        ? "border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500 placeholder-red-300"
        : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
    }`;
  };

  if (isLoadingMasterData) {
    return (
      <div className="flex justify-center items-center h-64">
        <svg
          className="animate-spin h-8 w-8 text-blue-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <span className="ml-2 text-gray-600">Loading form options...</span>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 bg-white p-8 rounded-xl shadow-lg"
    >
      {/* Header Section */}
      <div className="border-b border-gray-900/10 pb-8">
        <h2 className="text-2xl font-semibold leading-7 text-gray-900">
          Payment Information
        </h2>
        <p className="mt-1 text-sm leading-6 text-gray-600">
          Provide details about the payment received.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">
          <div className="sm:col-span-3 lg:col-span-2">
            <label className="block text-sm font-medium leading-6 text-gray-900">
              Invoice Type *
            </label>
            <select
              value={invoiceType}
              onChange={(e) => setInvoiceType(e.target.value as InvoiceType)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              {Object.values(InvoiceType).map((it) => (
                <option key={it} value={it}>
                  {it}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-3 lg:col-span-2">
            <label className="block text-sm font-medium leading-6 text-gray-900">
              Customer Code {isCustomerRequired && "*"}
            </label>
            <input
              type="text"
              value={customerCode}
              onChange={(e) => {
                setCustomerCode(
                  e.target.value.replace(/[^0-9]/g, "").slice(0, 8)
                );
                if (fieldErrors["customerCode"]) {
                  const newErrors = { ...fieldErrors };
                  delete newErrors["customerCode"];
                  setFieldErrors(newErrors);
                }
              }}
              disabled={!isCustomerRequired}
              className={getInputClass("customerCode")}
            />
            {fieldErrors["customerCode"] && (
              <p className="mt-1 text-xs text-red-600">
                {fieldErrors["customerCode"]}
              </p>
            )}
          </div>
          <div className="sm:col-span-6 lg:col-span-2">
            <label className="block text-sm font-medium leading-6 text-gray-900">
              Customer Name
            </label>
            <input
              type="text"
              value={customerName}
              readOnly
              className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm sm:text-sm"
            />
          </div>

          <div className="sm:col-span-3 lg:col-span-2">
            <label className="block text-sm font-medium leading-6 text-gray-900">
              Entity Code *
            </label>
            <select
              value={entityCode}
              onChange={(e) => {
                setEntityCode(e.target.value);
                setDivisionCode(""); // Reset dependent fields
                setBankAccount("");
                setProfitCenter("");
                if (fieldErrors["entityCode"]) {
                  const newErrors = { ...fieldErrors };
                  delete newErrors["entityCode"];
                  setFieldErrors(newErrors);
                }
              }}
              className={getInputClass("entityCode")}
            >
              <option value="">Select Entity</option>
              {masterEntities.map((e) => (
                <option key={e.code} value={e.code}>
                  {e.name}
                </option>
              ))}
            </select>
            {fieldErrors["entityCode"] && (
              <p className="mt-1 text-xs text-red-600">
                {fieldErrors["entityCode"]}
              </p>
            )}
          </div>
          <div className="sm:col-span-3 lg:col-span-2">
            <label className="block text-sm font-medium leading-6 text-gray-900">
              Division Code
            </label>
            <select
              value={divisionCode}
              onChange={(e) => setDivisionCode(e.target.value)}
              disabled={!entityCode}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm disabled:bg-gray-100 sm:text-sm"
            >
              <option value="">Select Division</option>
              {filteredDivisions.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-3 lg:col-span-2">
            <label className="block text-sm font-medium leading-6 text-gray-900">
              Case Type
            </label>
            <select
              value={caseType}
              onChange={(e) => setCaseType(e.target.value as any)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
            >
              <option value="">Select Type</option>
              <option value="Domestic">Domestic</option>
              <option value="Import">Import</option>
              <option value="Export">Export</option>
            </select>
          </div>
          <div className="sm:col-span-3 lg:col-span-2">
            <label className="block text-sm font-medium leading-6 text-gray-900">
              Bank Account (GL Code) *
            </label>
            <select
              value={bankAccount}
              onChange={(e) => {
                setBankAccount(e.target.value);
                if (fieldErrors["bankAccount"]) {
                  const newErrors = { ...fieldErrors };
                  delete newErrors["bankAccount"];
                  setFieldErrors(newErrors);
                }
              }}
              disabled={!entityCode}
              className={getInputClass("bankAccount")}
            >
              <option value="">Select Bank</option>
              {filteredBankAccounts.map((b) => (
                <option key={b.glCode} value={b.glCode}>
                  {b.name} - {b.glCode}
                </option>
              ))}
            </select>
            {fieldErrors["bankAccount"] && (
              <p className="mt-1 text-xs text-red-600">
                {fieldErrors["bankAccount"]}
              </p>
            )}
          </div>
          <div className="sm:col-span-3 lg:col-span-2">
            <label className="block text-sm font-medium leading-6 text-gray-900">
              Credit Control Area
            </label>
            <select
              value={creditControlArea}
              onChange={(e) => setCreditControlArea(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
            >
              <option value="">Select Area</option>
              {masterCreditControlAreas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-3 lg:col-span-2">
            <label className="block text-sm font-medium leading-6 text-gray-900">
              Profit Center
            </label>
            <select
              value={profitCenter}
              onChange={(e) => setProfitCenter(e.target.value)}
              disabled={!entityCode}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm disabled:bg-gray-100 sm:text-sm"
            >
              <option value="">Select Center</option>
              {filteredProfitCenters.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.code}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-full">
            <label className="block text-sm font-medium leading-6 text-gray-900">
              Remark
            </label>
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={2}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Payment Details Section */}
      <div className="border-b border-gray-900/10 pb-8">
        <h3 className="text-xl font-semibold text-gray-900">Payment Details</h3>
        <div className="mt-4 space-y-4">
          {paymentDetails.map((detail, index) => (
            <div
              key={detail.id}
              className="grid grid-cols-1 sm:grid-cols-12 gap-x-4 gap-y-2 items-start py-4 border-b last:border-b-0"
            >
              <div className="sm:col-span-5">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Bank Ref (UTR/Cheque) *
                </label>
                <input
                  type="text"
                  value={detail.bankReferenceNumber}
                  onChange={(e) =>
                    handleDetailChange(
                      detail.id,
                      "bankReferenceNumber",
                      e.target.value,
                      setPaymentDetails
                    )
                  }
                  className={getInputClass(`${detail.id}-bankReferenceNumber`)}
                />
                {fieldErrors[`${detail.id}-bankReferenceNumber`] && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors[`${detail.id}-bankReferenceNumber`]}
                  </p>
                )}
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={detail.amount ?? ""}
                  onChange={(e) =>
                    handleDetailChange(
                      detail.id,
                      "amount",
                      e.target.value ? parseFloat(e.target.value) : null,
                      setPaymentDetails
                    )
                  }
                  className={getInputClass(`${detail.id}-amount`)}
                />
                {fieldErrors[`${detail.id}-amount`] && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors[`${detail.id}-amount`]}
                  </p>
                )}
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={detail.paymentDate}
                  onChange={(e) =>
                    handleDetailChange(
                      detail.id,
                      "paymentDate",
                      e.target.value,
                      setPaymentDetails
                    )
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
                />
              </div>
              <div className="sm:col-span-1 flex items-center justify-end h-full pt-6">
                {paymentDetails.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDetail(detail.id, setPaymentDetails)}
                    className="p-1 text-red-600 hover:text-red-800"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={() =>
              addDetail(setPaymentDetails, {
                id: crypto.randomUUID(),
                bankReferenceNumber: "",
                amount: null,
                paymentDate: new Date().toISOString().split("T")[0],
              })
            }
            className="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Add Payment
          </button>
        </div>
      </div>

      {/* Invoice Details Section */}
      {invoiceType === InvoiceType.SPECIFIC && (
        <div className="pb-8">
          <h3 className="text-xl font-semibold text-gray-900">
            Invoice Details
          </h3>
          <div className="mt-4 mb-6 p-4 border rounded-lg bg-blue-50 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
            <div className="font-medium text-sm text-gray-700">
              Invoices Count:{" "}
              <span className="font-bold text-gray-900">
                {invoiceTotals.count}
              </span>
            </div>
            <div className="font-medium text-sm text-gray-700">
              Total Invoice Amt:{" "}
              <span className="font-bold text-gray-900">
                {formatCurrency(invoiceTotals.totalInvoiceAmount)}
              </span>
            </div>
            <div className="font-medium text-sm text-gray-700">
              Total Amt Paid:{" "}
              <span className="font-bold text-gray-900">
                {formatCurrency(invoiceTotals.totalInvoiceAmountPaid)}
              </span>
            </div>
            <div className="font-medium text-sm text-gray-700">
              Total TDS:{" "}
              <span className="font-bold text-gray-900">
                {formatCurrency(invoiceTotals.totalTdsAmount)}
              </span>
            </div>
            <div className="font-medium text-sm text-gray-700">
              Total GST Withheld:{" "}
              <span className="font-bold text-gray-900">
                {formatCurrency(invoiceTotals.totalGstWithheld)}
              </span>
            </div>
            <div className="font-medium text-sm text-gray-700">
              Total Amt Deducted:{" "}
              <span className="font-bold text-gray-900">
                {formatCurrency(invoiceTotals.totalInvoiceAmountDeducted)}
              </span>
            </div>
          </div>
          <div className="mt-4 space-y-4">
            {invoiceDetails.map((detail) => (
              <div
                key={detail.id}
                className="grid grid-cols-12 gap-x-4 gap-y-4 items-start p-4 border rounded-lg last:border-b-0 bg-gray-50"
              >
                <div className="col-span-12 sm:col-span-6 lg:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Invoice # *
                  </label>
                  <input
                    type="text"
                    value={detail.invoiceNumber}
                    onChange={(e) =>
                      handleDetailChange(
                        detail.id,
                        "invoiceNumber",
                        e.target.value,
                        setInvoiceDetails
                      )
                    }
                    className={getInputClass(`${detail.id}-invoiceNumber`)}
                  />
                  {fieldErrors[`${detail.id}-invoiceNumber`] && (
                    <p className="mt-1 text-xs text-red-600">
                      {fieldErrors[`${detail.id}-invoiceNumber`]}
                    </p>
                  )}
                </div>
                <div className="col-span-12 sm:col-span-6 lg:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Invoice Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={detail.invoiceAmount ?? ""}
                    onChange={(e) =>
                      handleDetailChange(
                        detail.id,
                        "invoiceAmount",
                        e.target.value ? parseFloat(e.target.value) : null,
                        setInvoiceDetails
                      )
                    }
                    className={getInputClass(`${detail.id}-invoiceAmount`)}
                  />
                  {fieldErrors[`${detail.id}-invoiceAmount`] && (
                    <p className="mt-1 text-xs text-red-600">
                      {fieldErrors[`${detail.id}-invoiceAmount`]}
                    </p>
                  )}
                </div>
                <div className="col-span-12 sm:col-span-6 lg:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Invoice Amount Paid
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={detail.invoiceAmountPaid ?? ""}
                    onChange={(e) =>
                      handleDetailChange(
                        detail.id,
                        "invoiceAmountPaid",
                        e.target.value ? parseFloat(e.target.value) : null,
                        setInvoiceDetails
                      )
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
                  />
                </div>
                <div className="col-span-12 sm:col-span-6 lg:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    TDS Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={detail.tdsAmount ?? ""}
                    onChange={(e) =>
                      handleDetailChange(
                        detail.id,
                        "tdsAmount",
                        e.target.value ? parseFloat(e.target.value) : null,
                        setInvoiceDetails
                      )
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
                  />
                </div>
                <div className="col-span-12 sm:col-span-6 lg:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    GST Withheld
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={detail.gstWithheldAmount ?? ""}
                    onChange={(e) =>
                      handleDetailChange(
                        detail.id,
                        "gstWithheldAmount",
                        e.target.value ? parseFloat(e.target.value) : null,
                        setInvoiceDetails
                      )
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
                  />
                </div>
                <div className="col-span-12 sm:col-span-6 lg:col-span-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Invoice Amt Deducted
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={detail.invoiceAmountDeducted ?? ""}
                    onChange={(e) =>
                      handleDetailChange(
                        detail.id,
                        "invoiceAmountDeducted",
                        e.target.value ? parseFloat(e.target.value) : null,
                        setInvoiceDetails
                      )
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
                  />
                </div>
                <div className="col-span-12 sm:col-span-6 lg:col-span-1 flex items-center justify-end h-full">
                  {invoiceDetails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDetail(detail.id, setInvoiceDetails)}
                      className="p-1 text-red-600 hover:text-red-800"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={() =>
                addDetail(setInvoiceDetails, {
                  id: crypto.randomUUID(),
                  invoiceNumber: "",
                  invoiceAmount: null,
                  invoiceAmountPaid: null,
                  tdsAmount: null,
                  gstWithheldAmount: null,
                  invoiceAmountDeducted: null,
                })
              }
              className="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Add Invoice
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex flex-col items-end gap-y-4">
        {formError && (
          <div className="rounded-md bg-red-50 p-4 w-full">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  {formError}
                </h3>
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center gap-x-6">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-sm font-semibold leading-6 text-gray-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Submitting..." : "Submit to SAP"}
          </button>
        </div>
      </div>
    </form>
  );
};

export default PaymentForm;
