import { GoogleGenAI, Type } from "@google/genai";
import { BriefingData, ExtractedData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateWelcomeBriefing = async (
  email: string
): Promise<BriefingData> => {
  if (!process.env.API_KEY) {
    return {
      title: "Welcome Back",
      content:
        "Gemini API Key is missing. Please configure it to see AI-generated briefings.",
      items: ["System Status: Offline", "Security Check: Skipped"],
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a personalized, futuristic security briefing and welcome message for a user with email ${email}. The tone should be professional yet high-tech.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: "A catchy headline for the daily briefing",
            },
            content: {
              type: Type.STRING,
              description:
                "A paragraph welcoming the user and summarizing system status (fictional)",
            },
            items: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                "3-4 bullet points of 'action items' or 'notifications'",
            },
          },
          required: ["title", "content", "items"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text) as BriefingData;
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      title: "System Alert",
      content: "Unable to retrieve daily briefing from the AI Core.",
      items: ["Check network connection", "Verify credentials"],
    };
  }
};

export const extractDataFromAdvise = async (
  file: File
): Promise<ExtractedData> => {
  if (!process.env.API_KEY) {
    throw new Error("Gemini API Key is missing.");
  }

  try {
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // remove data:image/png;base64, part
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const prompt = `Analyze this payment advice document and extract the following information into a structured JSON format:
    - Customer Code (if found)
    - Customer Name
    - Invoice Type (Must be one of: 'Advance payment', 'Bill payment for outstanding invoice not specific', 'Bill payment for specific invoice')
    - Bank Account (GL Code or Bank Name if GL not found)
    - Payment Details (Array of: Bank Reference/UTR, Amount, Payment Date)
    - Invoice Details (Array of: Invoice Number, Invoice Amount, Amount Paid, TDS, GST Withheld, Deductions)

    If specific values are missing, omit them or use null. Ensure dates are in YYYY-MM-DD format.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: file.type,
              data: base64Data,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            invoiceType: {
              type: Type.STRING,
              enum: [
                "Advance payment",
                "Bill payment for outstanding invoice not specific",
                "Bill payment for specific invoice",
              ],
            },
            customerCode: { type: Type.STRING, nullable: true },
            customerName: { type: Type.STRING, nullable: true },
            entityCode: { type: Type.STRING, nullable: true },
            divisionCode: { type: Type.STRING, nullable: true },
            caseType: {
              type: Type.STRING,
              enum: ["Domestic", "Import", "Export"],
              nullable: true,
            },
            bankAccount: { type: Type.STRING, nullable: true },
            creditControlArea: { type: Type.STRING, nullable: true },
            profitCenter: { type: Type.STRING, nullable: true },
            remark: { type: Type.STRING, nullable: true },
            paymentDetails: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  bankReferenceNumber: { type: Type.STRING },
                  amount: { type: Type.NUMBER, nullable: true },
                  paymentDate: { type: Type.STRING, description: "YYYY-MM-DD" },
                },
                required: ["bankReferenceNumber", "paymentDate"],
              },
            },
            invoiceDetails: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  invoiceNumber: { type: Type.STRING },
                  invoiceAmount: { type: Type.NUMBER, nullable: true },
                  invoiceAmountPaid: { type: Type.NUMBER, nullable: true },
                  tdsAmount: { type: Type.NUMBER, nullable: true },
                  gstWithheldAmount: { type: Type.NUMBER, nullable: true },
                  invoiceAmountDeducted: { type: Type.NUMBER, nullable: true },
                },
                required: ["invoiceNumber"],
              },
            },
          },
          required: ["invoiceType", "paymentDetails"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const data = JSON.parse(text);

    // Add unique IDs to lists as required by the UI state management
    if (data.paymentDetails) {
      data.paymentDetails = data.paymentDetails.map((p: any) => ({
        ...p,
        id: crypto.randomUUID(),
        amount: p.amount ?? null,
      }));
    }

    if (data.invoiceDetails) {
      data.invoiceDetails = data.invoiceDetails.map((i: any) => ({
        ...i,
        id: crypto.randomUUID(),
        invoiceAmount: i.invoiceAmount ?? null,
        invoiceAmountPaid: i.invoiceAmountPaid ?? null,
        tdsAmount: i.tdsAmount ?? null,
        gstWithheldAmount: i.gstWithheldAmount ?? null,
        invoiceAmountDeducted: i.invoiceAmountDeducted ?? null,
      }));
    }

    return data as ExtractedData;
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw new Error(
      "Failed to extract data from document. Please try again or fill manually."
    );
  }
};
