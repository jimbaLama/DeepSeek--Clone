"use client"
import { useUser } from "@clerk/nextjs";
import { createContext, useContext, useEffect } from "react"

export const AppContext = createContext();

export const useAppContext = () => {
    return useContext(AppContext)
}

export const AppContextProvider = ({children}) => {
    const {user, isLoaded} = useUser();
    const userId = user?.id;

    useEffect(() => {
        if (!isLoaded || !userId) return;

        fetch("/api/users/sync", { method: "POST" }).catch((error) => {
            console.error("Failed to sync user to the database:", error);
        });
    }, [isLoaded, userId]);

    const value = {
        user
    }

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
