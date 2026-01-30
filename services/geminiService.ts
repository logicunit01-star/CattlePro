
import { GoogleGenAI } from "@google/genai";
import { AppState } from "../types";
import { FIXED_CATEGORIES } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateFarmAnalysis = async (state: AppState, query: string): Promise<string> => {
  // Use gemini-3-pro-preview for advanced reasoning and complex analysis.
  const model = 'gemini-3-pro-preview';
  
  // Prepare a dynamic summary of categories
  const categoryBreakdown = FIXED_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = state.livestock.filter(c => c.category === cat).length;
    return acc;
  }, {} as Record<string, number>);

  const speciesBreakdown = {
      cattle: state.livestock.filter(c => c.species === 'CATTLE').length,
      goats: state.livestock.filter(c => c.species === 'GOAT').length
  };

  // Prepare a summary of the state to send to the model context
  const summary = {
    totalAnimals: state.livestock.length,
    speciesBreakdown: speciesBreakdown,
    categoryBreakdown: categoryBreakdown,
    totalExpenseLastMonth: state.expenses.reduce((sum, exp) => sum + exp.amount, 0),
    lowFeedStock: state.feed.filter(f => f.quantity <= f.reorderLevel).map(f => f.name),
    recentSales: state.sales.slice(0, 5),
    activeExpenses: state.expenses.slice(0, 5)
  };

  const prompt = `
    You are an expert agricultural farm consultant and financial analyst specializing in mixed livestock farming (Cattle & Goats).
    
    Here is the current snapshot of the farm data:
    ${JSON.stringify(summary, null, 2)}

    User Query: "${query}"
    Currency: PKR (Pakistan Rupee)

    Provide a concise, actionable, and professional response. If the query involves financials, provide specific insights on cost optimization or profit margins. If about operations, suggest best practices for livestock management based on the specific species and categories (e.g., Breeding vs Meat).
    Output formatted with clear headings or bullet points if necessary.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });
    // The .text property directly returns the string output from the model.
    return response.text || "Could not generate analysis.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I encountered an error while analyzing the farm data. Please check your API key.";
  }
};
