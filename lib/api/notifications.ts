import client from './client';

export interface Notification {
    id: number;
    notification_type: 'REGISTRATION_NEW' | 'REGISTRATION_ACCEPTED' | 'REGISTRATION_REJECTED' | 'PAYMENT_SUCCESS' | 'GENERAL';
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
}

export const notificationApi = {
    /**
     * Get all notifications for the current user
     */
    getNotifications: async () => {
        const response = await client.get('/api/v1/notifications/');
        return response.data;
    },

    /**
     * Mark a specific notification as read
     */
    markAsRead: async (id: number) => {
        const response = await client.post(`/api/v1/notifications/${id}/mark-read/`);
        return response.data;
    },

    /**
     * Mark all notifications as read
     */
    markAllAsRead: async () => {
        const response = await client.post('/api/v1/notifications/mark-all-read/');
        return response.data;
    }
};
