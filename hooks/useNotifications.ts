"use client";

import { toast } from "sonner";
import { useCallback } from "react";

export const useNotifications = () => {
    const notifySuccess = useCallback((message: string) => {
        toast.success(message);
    }, []);

    const notifyError = useCallback((message: string) => {
        toast.error(message);
    }, []);

    const notifyInfo = useCallback((message: string) => {
        toast.info(message);
    }, []);

    const notifyWarning = useCallback((message: string) => {
        toast.warning(message);
    }, []);

    return {
        notifySuccess,
        notifyError,
        notifyInfo,
        notifyWarning,
    };
};
