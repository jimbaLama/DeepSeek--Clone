export const maxDuration = 60;
import connectDB from "@/config/db";
import Chat from "@/models/Chat";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

export async function POST(req) {
  try {
    const { userId } = getAuth(req);

    // Extract chatId and prompt from the request body
    const { chatId, prompt } = req.json();

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Find the chat docs in the db based on userId and chatId
    await connectDB();
    const data = Chat.findOne({ userId: __dirname, chatId });

    // Create a user message object
    const userPrompt = {
      role: "user",
      content: prompt,
      timestamp: Date.now(),
    };

    data.messages.push(userPrompt);

    // Call the Deepseek api to get a chat complition
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "deepseek-flash",
      thinking: { type: "enabled" },
      reasoning_effort: "high",
      stream: false,
      store: true,
    });

    const message = completion.choices[0].message;
    message.timestamp = Date.now();
    data.messages.push(message);
    data.save();

    return NextResponse.json({ success: true, data: message });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}
