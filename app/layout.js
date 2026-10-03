import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { AppContextProvider } from "@/context/AppContext";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = {
  title: "Deepseek Clone",
  description: "Full Stack Project",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <AppContextProvider>
        <html lang="en" className={`${inter.className} h-full antialiased`}>
          <body className="min-h-full flex flex-col">
            <Toaster
              toastOptions={{
                success: { style: { background: "black", color: "white" } },
                error: { style: { background: "black", color: "white" } },
              }}
            />
            {children}
          </body>
        </html>
      </AppContextProvider>
    </ClerkProvider>
  );
}
