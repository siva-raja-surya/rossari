import React, { useState, useEffect, useMemo } from 'react';
import { InvoiceType, PaymentDetail, InvoiceDetail, FormSubmission, Page, ExtractedData } from '../types';
import { CUSTOMERS, ENTITIES, DIVISIONS, BANK_ACCOUNTS, CREDIT_CONTROL_AREAS, PROFIT_CENTERS } from '../constants';

interface PaymentFormProps {
  onSubmit: (submission: FormSubmission) => void;
  navigate: (page: Page) => void;
  initialData?: ExtractedData | null;
}

const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};


const PaymentForm: React.FC<PaymentFormProps> = ({ onSubmit, navigate, initialData }) => {
    const [invoiceType, setInvoiceType] = useState<InvoiceType>(InvoiceType.SPECIFIC);
    const [customerCode, setCustomerCode] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [entityCode, setEntityCode] = useState('');
    const [divisionCode, setDivisionCode] = useState('');
    const [caseType, setCaseType] = useState<'Domestic' | 'Import' | 'Export' | ''>('');
    const [bankAccount, setBankAccount] = useState('');
    const [creditControlArea, setCreditControlArea] = useState('');
    const [profitCenter, setProfitCenter] = useState('');
    const [remark, setRemark] = useState('');

    const [paymentDetails, setPaymentDetails] = useState<PaymentDetail[]>([{ id: crypto.randomUUID(), bankReferenceNumber: '', amount: null, paymentDate: new Date().toISOString().split('T')[0] }]);
    const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetail[]>([{ id: crypto.randomUUID(), invoiceNumber: '', invoiceAmount: null, invoiceAmountPaid: null, tdsAmount: null, gstWithheldAmount: null, invoiceAmountDeducted: null }]);
    
    const [customerCodeError, setCustomerCodeError] = useState('');
    
    useEffect(() => {
        if (initialData) {
            setInvoiceType(initialData.invoiceType || InvoiceType.SPECIFIC);
            setCustomerCode(initialData.customerCode || '');
            setCustomerName(initialData.customerName || '');
            setEntityCode(initialData.entityCode || '');
            setDivisionCode(initialData.divisionCode || '');
            setCaseType(initialData.caseType || '');
            setBankAccount(initialData.bankAccount || '');
            setCreditControlArea(initialData.creditControlArea || '');
            setProfitCenter(initialData.profitCenter || '');
            setRemark(initialData.remark || '');

            // Auto-select entity based on bank account
            if (initialData.bankAccount) {
                const matchedAccount = BANK_ACCOUNTS.find(acc => 
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
    }, [initialData]);

    useEffect(() => {
        if (customerCode.length === 8) {
            const customer = CUSTOMERS.find(c => c.code === customerCode);
            if (customer) {
                setCustomerName(customer.name);
                setCustomerCodeError('');
            } else {
                setCustomerName('');
                setCustomerCodeError('Invalid customer code.');
            }
        } else {
            setCustomerName('');
            setCustomerCodeError(''); // Clear error for partial/empty input
        }
    }, [customerCode]);

    const invoiceTotals = useMemo(() => {
        const safeSum = (arr: InvoiceDetail[], key: keyof InvoiceDetail) => 
            arr.reduce((acc, item) => acc + (Number(item[key]) || 0), 0);

        return {
            count: invoiceDetails.length,
            totalInvoiceAmount: safeSum(invoiceDetails, 'invoiceAmount'),
            totalInvoiceAmountPaid: safeSum(invoiceDetails, 'invoiceAmountPaid'),
            totalTdsAmount: safeSum(invoiceDetails, 'tdsAmount'),
            totalGstWithheld: safeSum(invoiceDetails, 'gstWithheldAmount'),
            totalInvoiceAmountDeducted: safeSum(invoiceDetails, 'invoiceAmountDeducted'),
        };
    }, [invoiceDetails]);

    const handleDetailChange = <T,>(
        id: string, 
        field: keyof T, 
        value: any, 
        setter: React.Dispatch<React.SetStateAction<T[]>>
    ) => {
        setter(prev => prev.map(item => (item as any).id === id ? { ...item, [field]: value } : item));
    };
    
    const addDetail = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, newDetail: T) => {
        setter(prev => [...prev, newDetail]);
    };

    const removeDetail = <T,>(id: string, setter: React.Dispatch<React.SetStateAction<T[]>>) => {
        setter(prev => prev.filter(item => (item as any).id !== id));
    };

    const isCustomerRequired = invoiceType === InvoiceType.ADVANCE || invoiceType === InvoiceType.OUTSTANDING;

    const isFormValid = () => {
        if (!entityCode || !bankAccount) return false;
        
        if (isCustomerRequired) {
            if (customerCode.length !== 8 || customerCodeError) {
                return false;
            }
        }

        if (paymentDetails.some(p => !p.bankReferenceNumber)) return false;
        
        if (invoiceType === InvoiceType.SPECIFIC && invoiceDetails.some(i => !i.invoiceNumber)) return false;
        
        return true;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid()) {
            alert("Please fill all mandatory fields correctly.");
            return;
        }

        const newSubmission: FormSubmission = {
            id: `SUB-${Date.now().toString().slice(-6)}`,
            submittedAt: new Date(),
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
            invoiceDetails: invoiceType === InvoiceType.SPECIFIC ? invoiceDetails : undefined,
        };
        console.log("Submitting to Power Automate (mock):", JSON.stringify(newSubmission, null, 2));
        onSubmit(newSubmission);
    };

    const filteredDivisions = entityCode ? DIVISIONS.filter(d => d.entityCode === entityCode) : [];
    const filteredBankAccounts = entityCode ? BANK_ACCOUNTS.filter(b => b.entityCode === entityCode) : [];
    const filteredProfitCenters = entityCode ? PROFIT_CENTERS[entityCode] || [] : [];
    const customerCodeLengthError = isCustomerRequired && customerCode.length > 0 && customerCode.length < 8;

    return (
      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-xl shadow-lg">
        {/* Header Section */}
        <div className="border-b border-gray-900/10 pb-8">
            <h2 className="text-2xl font-semibold leading-7 text-gray-900">Payment Information</h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">Provide details about the payment received.</p>
            <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">
                <div className="sm:col-span-3 lg:col-span-2">
                    <label className="block text-sm font-medium leading-6 text-gray-900">Invoice Type *</label>
                    <select value={invoiceType} onChange={e => setInvoiceType(e.target.value as InvoiceType)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                        {Object.values(InvoiceType).map(it => <option key={it} value={it}>{it}</option>)}
                    </select>
                </div>
                <div className="sm:col-span-3 lg:col-span-2">
                    <label className="block text-sm font-medium leading-6 text-gray-900">Customer Code {isCustomerRequired && '*'}</label>
                    <input type="text" value={customerCode} onChange={e => setCustomerCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))} disabled={!isCustomerRequired} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm disabled:bg-gray-100 sm:text-sm" />
                    {customerCodeError && <p className="mt-1 text-xs text-red-500">{customerCodeError}</p>}
                    {customerCodeLengthError && <p className="mt-1 text-xs text-red-500">Customer code must be 8 digits.</p>}
                </div>
                <div className="sm:col-span-6 lg:col-span-2">
                    <label className="block text-sm font-medium leading-6 text-gray-900">Customer Name</label>
                    <input type="text" value={customerName} readOnly className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm sm:text-sm" />
                </div>

                <div className="sm:col-span-3 lg:col-span-2">
                    <label className="block text-sm font-medium leading-6 text-gray-900">Entity Code *</label>
                    <select value={entityCode} onChange={e => setEntityCode(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm">
                        <option value="">Select Entity</option>
                        {ENTITIES.map(e => <option key={e.code} value={e.code}>{e.name}</option>)}
                    </select>
                </div>
                <div className="sm:col-span-3 lg:col-span-2">
                    <label className="block text-sm font-medium leading-6 text-gray-900">Division Code</label>
                    <select value={divisionCode} onChange={e => setDivisionCode(e.target.value)} disabled={!entityCode} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm disabled:bg-gray-100 sm:text-sm">
                        <option value="">Select Division</option>
                        {filteredDivisions.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                    </select>
                </div>
                <div className="sm:col-span-3 lg:col-span-2">
                    <label className="block text-sm font-medium leading-6 text-gray-900">Case Type</label>
                    <select value={caseType} onChange={e => setCaseType(e.target.value as any)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm">
                        <option value="">Select Type</option>
                        <option value="Domestic">Domestic</option>
                        <option value="Import">Import</option>
                        <option value="Export">Export</option>
                    </select>
                </div>
                <div className="sm:col-span-3 lg:col-span-2">
                    <label className="block text-sm font-medium leading-6 text-gray-900">Bank Account (GL Code) *</label>
                    <select value={bankAccount} onChange={e => setBankAccount(e.target.value)} disabled={!entityCode} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm disabled:bg-gray-100 sm:text-sm">
                        <option value="">Select Bank</option>
                        {filteredBankAccounts.map(b => <option key={b.glCode} value={b.glCode}>{b.name} - {b.glCode}</option>)}
                    </select>
                </div>
                <div className="sm:col-span-3 lg:col-span-2">
                    <label className="block text-sm font-medium leading-6 text-gray-900">Credit Control Area</label>
                    <select value={creditControlArea} onChange={e => setCreditControlArea(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm">
                        <option value="">Select Area</option>
                        {CREDIT_CONTROL_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>
                <div className="sm:col-span-3 lg:col-span-2">
                    <label className="block text-sm font-medium leading-6 text-gray-900">Profit Center</label>
                    <select value={profitCenter} onChange={e => setProfitCenter(e.target.value)} disabled={!entityCode} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm disabled:bg-gray-100 sm:text-sm">
                        <option value="">Select Center</option>
                        {filteredProfitCenters.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                <div className="sm:col-span-full">
                    <label className="block text-sm font-medium leading-6 text-gray-900">Remark</label>
                    <textarea value={remark} onChange={e => setRemark(e.target.value)} rows={2} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
                </div>
            </div>
        </div>
        
        {/* Payment Details Section */}
        <div className="border-b border-gray-900/10 pb-8">
            <h3 className="text-xl font-semibold text-gray-900">Payment Details</h3>
            <div className="mt-4 space-y-4">
                {paymentDetails.map((detail, index) => (
                    <div key={detail.id} className="grid grid-cols-1 sm:grid-cols-12 gap-x-4 gap-y-2 items-center py-2 border-b last:border-b-0">
                        <div className="sm:col-span-5">
                            <label className="block text-xs font-medium text-gray-700">Bank Ref (UTR/Cheque) *</label>
                            <input type="text" value={detail.bankReferenceNumber} onChange={e => handleDetailChange(detail.id, 'bankReferenceNumber', e.target.value, setPaymentDetails)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
                        </div>
                        <div className="sm:col-span-3">
                             <label className="block text-xs font-medium text-gray-700">Amount</label>
                             <input type="number" step="0.01" value={detail.amount ?? ''} onChange={e => handleDetailChange(detail.id, 'amount', e.target.value ? parseFloat(e.target.value) : null, setPaymentDetails)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
                        </div>
                        <div className="sm:col-span-3">
                            <label className="block text-xs font-medium text-gray-700">Payment Date</label>
                            <input type="date" value={detail.paymentDate} onChange={e => handleDetailChange(detail.id, 'paymentDate', e.target.value, setPaymentDetails)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
                        </div>
                         <div className="sm:col-span-1 flex items-end justify-end">
                            {paymentDetails.length > 1 && (
                                <button type="button" onClick={() => removeDetail(detail.id, setPaymentDetails)} className="p-1 text-red-600 hover:text-red-800">
                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-4">
                <button type="button" onClick={() => addDetail(setPaymentDetails, { id: crypto.randomUUID(), bankReferenceNumber: '', amount: null, paymentDate: new Date().toISOString().split('T')[0] })} className="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                    Add Payment
                </button>
            </div>
        </div>

        {/* Invoice Details Section */}
        {invoiceType === InvoiceType.SPECIFIC && (
            <div className="pb-8">
                <h3 className="text-xl font-semibold text-gray-900">Invoice Details</h3>
                 <div className="mt-4 mb-6 p-4 border rounded-lg bg-blue-50 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
                    <div className="font-medium text-sm text-gray-700">Invoices Count: <span className="font-bold text-gray-900">{invoiceTotals.count}</span></div>
                    <div className="font-medium text-sm text-gray-700">Total Invoice Amt: <span className="font-bold text-gray-900">{formatCurrency(invoiceTotals.totalInvoiceAmount)}</span></div>
                    <div className="font-medium text-sm text-gray-700">Total Amt Paid: <span className="font-bold text-gray-900">{formatCurrency(invoiceTotals.totalInvoiceAmountPaid)}</span></div>
                    <div className="font-medium text-sm text-gray-700">Total TDS: <span className="font-bold text-gray-900">{formatCurrency(invoiceTotals.totalTdsAmount)}</span></div>
                    <div className="font-medium text-sm text-gray-700">Total GST Withheld: <span className="font-bold text-gray-900">{formatCurrency(invoiceTotals.totalGstWithheld)}</span></div>
                    <div className="font-medium text-sm text-gray-700">Total Amt Deducted: <span className="font-bold text-gray-900">{formatCurrency(invoiceTotals.totalInvoiceAmountDeducted)}</span></div>
                </div>
                <div className="mt-4 space-y-4">
                    {invoiceDetails.map((detail) => (
                        <div key={detail.id} className="grid grid-cols-12 gap-x-4 gap-y-4 items-end p-4 border rounded-lg last:border-b-0 bg-gray-50">
                            <div className="col-span-12 sm:col-span-6 lg:col-span-2">
                                <label className="block text-xs font-medium text-gray-700">Invoice # *</label>
                                <input type="text" value={detail.invoiceNumber} onChange={e => handleDetailChange(detail.id, 'invoiceNumber', e.target.value, setInvoiceDetails)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
                            </div>
                            <div className="col-span-12 sm:col-span-6 lg:col-span-2">
                                <label className="block text-xs font-medium text-gray-700">Invoice Amount</label>
                                <input type="number" step="0.01" value={detail.invoiceAmount ?? ''} onChange={e => handleDetailChange(detail.id, 'invoiceAmount', e.target.value ? parseFloat(e.target.value) : null, setInvoiceDetails)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
                            </div>
                             <div className="col-span-12 sm:col-span-6 lg:col-span-2">
                                <label className="block text-xs font-medium text-gray-700">Invoice Amount Paid</label>
                                <input type="number" step="0.01" value={detail.invoiceAmountPaid ?? ''} onChange={e => handleDetailChange(detail.id, 'invoiceAmountPaid', e.target.value ? parseFloat(e.target.value) : null, setInvoiceDetails)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
                            </div>
                             <div className="col-span-12 sm:col-span-6 lg:col-span-2">
                                <label className="block text-xs font-medium text-gray-700">TDS Amount</label>
                                <input type="number" step="0.01" value={detail.tdsAmount ?? ''} onChange={e => handleDetailChange(detail.id, 'tdsAmount', e.target.value ? parseFloat(e.target.value) : null, setInvoiceDetails)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
                            </div>
                             <div className="col-span-12 sm:col-span-6 lg:col-span-2">
                                <label className="block text-xs font-medium text-gray-700">GST Withheld</label>
                                <input type="number" step="0.01" value={detail.gstWithheldAmount ?? ''} onChange={e => handleDetailChange(detail.id, 'gstWithheldAmount', e.target.value ? parseFloat(e.target.value) : null, setInvoiceDetails)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
                            </div>
                             <div className="col-span-12 sm:col-span-6 lg:col-span-1">
                                <label className="block text-xs font-medium text-gray-700">Invoice Amt Deducted</label>
                                <input type="number" step="0.01" value={detail.invoiceAmountDeducted ?? ''} onChange={e => handleDetailChange(detail.id, 'invoiceAmountDeducted', e.target.value ? parseFloat(e.target.value) : null, setInvoiceDetails)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
                            </div>
                            <div className="col-span-12 sm:col-span-6 lg:col-span-1 flex items-center justify-end">
                                {invoiceDetails.length > 1 && (
                                    <button type="button" onClick={() => removeDetail(detail.id, setInvoiceDetails)} className="p-1 text-red-600 hover:text-red-800">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-4">
                    <button type="button" onClick={() => addDetail(setInvoiceDetails, { id: crypto.randomUUID(), invoiceNumber: '', invoiceAmount: null, invoiceAmountPaid: null, tdsAmount: null, gstWithheldAmount: null, invoiceAmountDeducted: null })} className="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                        Add Invoice
                    </button>
                </div>
            </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-x-6">
            <button type="button" onClick={() => navigate('DASHBOARD')} className="text-sm font-semibold leading-6 text-gray-900">
            Cancel
            </button>
            <button
                type="submit"
                disabled={!isFormValid()}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:bg-gray-400"
            >
            Submit to SAP
            </button>
        </div>
      </form>
    );
};

export default PaymentForm;