import { useEffect, useState, useCallback } from 'react';
import { getNotifications, markNotificationAsRead } from '../services/api';
import { Notification } from '../types/notification';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchNotifications = useCallback(async () => {
    const res = await getNotifications();
    setNotifications(res.data);
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getClaimRoute = (claimId?: string | number) => {
    
    if (!claimId) return null;

    switch (user?.role) {
      case 'LINE_MANAGER':
        return `/manager/claims/${claimId}`;
      case 'FINANCE_OFFICER':
        return `/finance/claims/${claimId}`;
      default:
        return `/employee/claims/${claimId}`;
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      // mark as read first
      await markNotificationAsRead(notification.notificationId);

      setNotifications(prev =>
        prev.map(n =>
          n.notificationId === notification.notificationId
            ? { ...n, isRead: true }
            : n
        )
      );
      
      const route = getClaimRoute(notification.claimId);

      if (route) {
        navigate(route);
      }

      setOpen(false);
    } catch (err) {
      console.error('Failed to handle notification click', err);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block'  }}>
      

      <button
            onClick={() => setOpen(prev => !prev)}
            style={{
            fontSize: '18px',
            cursor: 'pointer',
            background: 'transparent',
            border: 'none',
            }}
        >
        🔔
    </button>

       {unreadCount > 0 && (
            <span
            style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                background: 'red',
                color: 'white',
                borderRadius: '50%',
                minWidth: '18px',
                height: '18px',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none', //prevents blocking clicks
            }}
            >
        {unreadCount}
            </span>
        )}
      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '40px',
            width: '300px',
            background: 'white',
            border: '1px solid #ccc',
            borderRadius: '8px',
            zIndex: 1000,
          }}
        >
          {notifications.length === 0 ? (
            <p style={{ padding: 10 }}>No notifications</p>
          ) : (
            notifications.map(n => (
              <div 
                key={n.notificationId}
                
                onClick={() => handleNotificationClick(n)}
                style={{
                  padding: '10px',
                  cursor: 'pointer',
                  background: n.isRead ? '#fff' : '#eef6ff',
                  borderBottom: '1px solid #eee',
                }}
              >
                {n.message}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}