import { GoogleGenAI, Type } from '@google/genai';
import { ExtractedData, InvoiceType } from '../types';

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        if (typeof reader.result === 'string') {
            resolve(reader.result.split(',')[1]);
        } else {
            resolve('');
        }
    };
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        invoiceType: { type: Type.STRING, enum: Object.values(InvoiceType), description: "Infer the invoice type based on document content." },
        customerName: { type: Type.STRING, description: "Customer's name, if found.", nullable: true },
        entityCode: { type: Type.STRING, description: "The 4-digit entity code, if found.", nullable: true },
        divisionCode: { type: Type.STRING, description: "The 2-digit division code, if found.", nullable: true },
        caseType: { type: Type.STRING, enum: ['Domestic', 'Import', 'Export'], description: "Case type, if mentioned.", nullable: true },
        bankAccount: { type: Type.STRING, description: "Bank account name (e.g. 'HDFC') or GL code mentioned in the payment details.", nullable: true },
        creditControlArea: { type: Type.STRING, description: "Credit Control Area if mentioned.", nullable: true },
        profitCenter: { type: Type.STRING, description: "Profit Center if mentioned.", nullable: true },
        remark: { type: Type.STRING, description: "Any remarks or notes.", nullable: true },
        paymentDetails: {
            type: Type.ARRAY,
            description: "List of all payment entries found.",
            items: {
                type: Type.OBJECT,
                properties: {
                    bankReferenceNumber: { type: Type.STRING, description: "UTR or Cheque number for the payment." },
                    amount: { type: Type.NUMBER, description: "Payment amount.", nullable: true },
                    paymentDate: { type: Type.STRING, description: "Date of payment in YYYY-MM-DD format.", nullable: true },
                },
                required: ["bankReferenceNumber"]
            }
        },
        invoiceDetails: {
            type: Type.ARRAY,
            description: "List of all invoice entries the payment is for.",
            items: {
                type: Type.OBJECT,
                properties: {
                    invoiceNumber: { type: Type.STRING, description: "The 12-digit alphanumeric invoice number, which must start with 'DM'." },
                    invoiceAmount: { type: Type.NUMBER, description: "The total amount for this specific invoice. Leave blank if not available.", nullable: true },
                    invoiceAmountPaid: { type: Type.NUMBER, description: "The net amount paid by the customer for this specific invoice after all deductions. If the document is for paying a previously withheld amount (like GST), this field should capture that amount.", nullable: true },
                    tdsAmount: { type: Type.NUMBER, description: "Tax Deducted at Source (TDS) amount deducted for this specific invoice, if mentioned.", nullable: true },
                    gstWithheldAmount: { type: Type.NUMBER, description: "GST amount withheld for this specific invoice, if mentioned.", nullable: true },
                    invoiceAmountDeducted: { type: Type.NUMBER, description: "Any other amount deducted from the invoice total by the customer (e.g. 'short payment', 'rate difference'), if mentioned.", nullable: true }
                },
                required: ["invoiceNumber"]
            }
        }
    }
};

export const extractDataFromAdvise = async (file: File): Promise<ExtractedData> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const imagePart = await fileToGenerativePart(file);

  const prompt = `
    You are an expert data extraction assistant for accounting documents. Your task is to analyze the provided payment advice document and extract all relevant information. Format your output as a single JSON object that strictly adheres to the provided schema. Do not include any text, markdown, or formatting outside of the JSON object.

    Key Extraction Rules:
    - **Invoice Type**: Infer the 'invoiceType'. If specific invoice numbers are listed, use '${InvoiceType.SPECIFIC}'. For a general payment without specific invoices, use '${InvoiceType.OUTSTANDING}'. If it mentions an advance payment, use '${InvoiceType.ADVANCE}'.
    - **Invoice Number**: An invoice number MUST be a 12-digit alphanumeric string and starts with 'DM'. Extract it precisely.
    - **Invoice Consolidation**: If an invoice number appears multiple times (e.g., once for the main amount and again for a GST deduction), you MUST consolidate all information for that invoice into a single JSON object in the 'invoiceDetails' array. Do not create separate entries for the same invoice number.
    - **Invoice Amount**: For each invoice, extract its total amount into 'invoiceAmount'. If it's not available, this can be left blank.
    - **Deductions Extraction (TDS, GST, etc.)**: For each invoice listed, you must check for any deductions mentioned. Extract the Tax Deducted at Source (TDS) into 'tdsAmount', any GST withheld amount into 'gstWithheldAmount', and any other general invoice amount deductions (e.g., 'short payment', 'rate difference') into 'invoiceAmountDeducted'. Example: For an invoice, if the document mentions "TDS: ₹23.24, GST Withheld: ₹34534.13, Invoice Amount Deducted: ₹23422.12", you must extract these values accordingly.
    - **Invoice Amount Paid**: For each invoice, you must calculate and extract the net amount paid by the customer into 'invoiceAmountPaid'. This should be 'invoiceAmount' minus all deductions ('tdsAmount', 'gstWithheldAmount', 'invoiceAmountDeducted'). If the advice document is specifically for paying back a previously withheld amount (like GST), this field should capture that paid amount directly.
    - **Deduction Nullification**: Pay close attention to amounts being deducted and then reversed. For example, if for a single invoice you see "GST withheld: ₹1000" and also "GST paid: ₹-1000" (or similar reversal), these two entries cancel each other out. In such cases, you should treat the net deduction for that category (e.g., 'gstWithheldAmount') as zero or null. Only report the final, net deduction amount.
    - **Header Information**: You must extract header-level information if it is present anywhere in the document. This includes 'divisionCode', 'caseType', 'bankAccount' (extract either the bank name like 'HDFC' or its GL Code), 'creditControlArea', 'profitCenter', and any 'remark' or notes.
    - **Payment Details**: Extract all payment references (UTR/Cheque numbers), amounts, and dates. Format all dates as YYYY-MM-DD.
    - **Completeness**: If a value for a field is not found in the document, omit the field from the JSON or use null.
    `;

  try {
    // --- ⬇️ START: ADDED PRICING CONSTANTS ⬇️ ---
    // Model: gemini-2.5-flash
    const INPUT_PRICE_USD_PER_1M_TOKENS = 0.30;
    const OUTPUT_PRICE_USD_PER_1M_TOKENS = 2.50;
    
    // As of Nov 14, 2025. Update this value as needed.
    const EXCHANGE_RATE_USD_TO_INR = 88.73; 
    // --- ⬆️ END: ADDED PRICING CONSTANTS ⬆️ ---

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      },
    });

    // --- ⬇️ START: MODIFIED LOGGING BLOCK ⬇️ ---
    if (response.usageMetadata) {
      const inputTokens = response.usageMetadata.promptTokenCount;
      const outputTokens = response.usageMetadata.candidatesTokenCount;
      // Use 'thoughtsTokenCount' as found in your raw log
      const thinkingTokens = (response.usageMetadata as any).thoughtsTokenCount || 0;
      const totalOutputTokens = outputTokens + thinkingTokens;
      const totalTokens = response.usageMetadata.totalTokenCount;

      // Cost Calculation (USD)
      const inputCostUSD = (inputTokens / 1_000_000) * INPUT_PRICE_USD_PER_1M_TOKENS;
      const outputCostUSD = (totalOutputTokens / 1_000_000) * OUTPUT_PRICE_USD_PER_1M_TOKENS;
      const totalCostUSD = inputCostUSD + outputCostUSD;

      // Cost Calculation (INR)
      const inputCostINR = inputCostUSD * EXCHANGE_RATE_USD_TO_INR;
      const outputCostINR = outputCostUSD * EXCHANGE_RATE_USD_TO_INR;
      const totalCostINR = totalCostUSD * EXCHANGE_RATE_USD_TO_INR;

      console.log('--- 🤖 Gemini API Cost & Usage ---');
      console.log(`Model: gemini-2.5-flash`);
      console.log('---');
      console.log(`Input Tokens:     ${inputTokens}`);
      console.log(`Output Tokens:    ${outputTokens} (Candidates) + ${thinkingTokens} (Thinking) = ${totalOutputTokens}`);
      console.log(`Total Tokens:     ${totalTokens}`);
      console.log('---');
      console.log(`Input Cost:       $${inputCostUSD.toFixed(8)} | ₹${inputCostINR.toFixed(6)}`);
      console.log(`Output Cost:      $${outputCostUSD.toFixed(8)} | ₹${outputCostINR.toFixed(6)}`);
      console.log(`Total Cost:       $${totalCostUSD.toFixed(8)} | ₹${totalCostINR.toFixed(6)}`);
      console.log('-----------------------------------');
      
      // Optional: Log the raw object if you still want it
      // console.log('Raw usageMetadata:', JSON.stringify(response.usageMetadata, null, 2));

    } else {
      console.log("Usage metadata not found in response.");
    }
    // --- ⬆️ END: MODIFIED LOGGING BLOCK ⬆️ ---

    const text = response.text.trim();
    const extractedJson = JSON.parse(text);

    // Consolidate invoice details to prevent duplicates from extraction
    const invoiceMap = new Map<string, any>();
    if (extractedJson.invoiceDetails) {
        for (const item of extractedJson.invoiceDetails) {
            if (!item.invoiceNumber) continue;

            const existing = invoiceMap.get(item.invoiceNumber);
            if (existing) {
                // Merge: prefer existing non-null values, but sum up deduction fields.
                existing.invoiceAmount = existing.invoiceAmount ?? item.invoiceAmount ?? null;
                existing.invoiceAmountPaid = existing.invoiceAmountPaid ?? item.invoiceAmountPaid ?? null;
                existing.tdsAmount = ((existing.tdsAmount || 0) + (item.tdsAmount || 0)) || null;
                existing.gstWithheldAmount = ((existing.gstWithheldAmount || 0) + (item.gstWithheldAmount || 0)) || null;
                existing.invoiceAmountDeducted = ((existing.invoiceAmountDeducted || 0) + (item.invoiceAmountDeducted || 0)) || null;
            } else {
                invoiceMap.set(item.invoiceNumber, { ...item });
            }
        }
    }
    const consolidatedInvoices = Array.from(invoiceMap.values());

    // Transform the extracted JSON to match our FormSubmission structure
    const transformedData: ExtractedData = {
        invoiceType: extractedJson.invoiceType || InvoiceType.SPECIFIC,
        customerCode: extractedJson.customerCode || '',
        customerName: extractedJson.customerName || '',
        entityCode: extractedJson.entityCode || '',
        divisionCode: extractedJson.divisionCode || '',
        caseType: extractedJson.caseType,
        bankAccount: extractedJson.bankAccount || '',
        creditControlArea: extractedJson.creditControlArea || '',
        profitCenter: extractedJson.profitCenter || '',
        remark: extractedJson.remark || '',
        paymentDetails: (extractedJson.paymentDetails || []).map((p: any) => ({
            id: crypto.randomUUID(),
            bankReferenceNumber: p.bankReferenceNumber || '',
            amount: p.amount || null,
            paymentDate: p.paymentDate || new Date().toISOString().split('T')[0],
        })),
        invoiceDetails: consolidatedInvoices.map((i: any) => ({
            id: crypto.randomUUID(),
            invoiceNumber: i.invoiceNumber || '',
            invoiceAmount: i.invoiceAmount || null,
            invoiceAmountPaid: i.invoiceAmountPaid || null,
            tdsAmount: i.tdsAmount || null,
            gstWithheldAmount: i.gstWithheldAmount || null,
            invoiceAmountDeducted: i.invoiceAmountDeducted || null,
        })),
    };
    
    return transformedData;

  } catch (error) {
    console.error("Error extracting data with Gemini:", error);
    throw new Error("Failed to analyze the document. Please check the file or try again.");
  }
};