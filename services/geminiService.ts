import { GoogleGenAI } from "@google/genai";
import { Client, Expense } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Generate a polite payment reminder or a project update message
export const generateClientMessage = async (
  client: Client, 
  type: 'PAYMENT_REMINDER' | 'WELCOME' | 'INVOICE_EMAIL' | 'MONTHLY_PAYMENT_REMINDER',
  dueAmount: number
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    
    let prompt = "";
    const servicesList = client.services.join(", ");

    if (type === 'PAYMENT_REMINDER') {
      prompt = `
        Write a professional, polite, yet firm WhatsApp message (short) to a client named "${client.name}" from "${client.businessName}".
        Context: They have a pending payment of INR ${dueAmount} for digital marketing services (${servicesList}).
        Ask them to clear the dues to ensure uninterrupted services.
        Do not include subject lines or placeholders. Just the message body.
      `;
    } else if (type === 'MONTHLY_PAYMENT_REMINDER') {
      prompt = `
        Write a friendly, professional WhatsApp message to client "${client.name}" (${client.businessName}).
        Context: This is a reminder that their monthly service renewal for (${servicesList}) is coming up/due.
        It has been one month since the last cycle.
        Politely request them to process the monthly payment to keep the campaign active. 
        Keep it short and warm.
      `;
    } else if (type === 'WELCOME') {
      prompt = `
        Write a short, enthusiastic welcome email body for a new client "${client.businessName}" who just signed up for: ${servicesList}.
        Mention that the project starts on ${client.startDate}.
        Keep it professional and encouraging.
      `;
    } else if (type === 'INVOICE_EMAIL') {
      prompt = `
        Write a very short email body sending an invoice to "${client.name}".
        Mention the total deal amount is ${client.dealAmount} and the current due is ${dueAmount}.
        Polite closing.
      `;
    }

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text || "Could not generate message.";
  } catch (error) {
    console.error("Error generating AI message:", error);
    return "Error generating message. Please try again.";
  }
};

// Chat with CRM Data
export const chatWithData = async (
  query: string,
  clients: Client[],
  expenses: Expense[]
): Promise<string> => {
  try {
    // 1. Prepare a lightweight summary of the data to save tokens and provide context
    const clientsSummary = clients.map(c => {
      const paid = c.payments.reduce((sum, p) => sum + p.amount, 0);
      return {
        name: c.name,
        business: c.businessName,
        status: c.status,
        services: c.services.join(", "),
        totalDeal: c.dealAmount,
        paid: paid,
        due: c.dealAmount - paid,
        start: c.startDate
      };
    });

    const expensesSummary = expenses.map(e => ({
      title: e.title,
      amount: e.amount,
      category: e.category,
      date: e.date
    }));

    const systemPrompt = `
      You are an intelligent assistant for a Digital Marketing Agency CRM called "AgencyFlow".
      
      Here is the current LIVE business data:
      
      CLIENTS DATA:
      ${JSON.stringify(clientsSummary, null, 2)}
      
      EXPENSES DATA:
      ${JSON.stringify(expensesSummary, null, 2)}
      
      INSTRUCTIONS:
      1. Answer the user's question based strictly on the data above.
      2. If asked about "Overdue" or "Due", look for clients where 'due' > 0.
      3. If asked about "Revenue", sum up the 'paid' amounts.
      4. If asked about "Profit", subtract total expenses from total revenue.
      5. Provide concise, direct answers. Use formatting like bullet points for lists.
      6. If the user asks something unrelated to the data, politely say you only manage agency data.
      
      User Query: "${query}"
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: systemPrompt,
    });

    return response.text || "I couldn't process that request.";
  } catch (error) {
    console.error("Error in AI Chat:", error);
    return "Sorry, I'm having trouble accessing the data right now.";
  }
};