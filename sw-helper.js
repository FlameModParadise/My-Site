/* ========= Service Worker Helper Functions ========= */

class ServiceWorkerHelper {
  constructor() {
    this.registration = null;
    this.isSupported = 'serviceWorker' in navigator;
  }

  async init() {
    if (!this.isSupported) {
      console.warn('Service Worker not supported in this browser');
      return false;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registered successfully');
      
      // Listen for updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this.showUpdateNotification();
          }
        });
      });

      return true;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  }

  showUpdateNotification() {
    if (confirm('A new version of the app is available. Update now?')) {
      this.updateServiceWorker();
    }
  }

  async updateServiceWorker() {
    if (this.registration && this.registration.waiting) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }

  async getCacheInfo() {
    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data);
      };
      
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage(
          { type: 'GET_CACHE_SIZE' },
          [messageChannel.port2]
        );
      } else {
        resolve({});
      }
    });
  }

  async clearCache(cacheName = null) {
    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data);
      };
      
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage(
          { type: 'CLEAR_CACHE', cacheName },
          [messageChannel.port2]
        );
      } else {
        resolve({ success: false, message: 'No service worker controller' });
      }
    });
  }

  async requestNotificationPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  async showNotification(title, options = {}) {
    if (this.registration && 'showNotification' in this.registration) {
      const defaultOptions = {
        body: '',
        icon: '/assets/icons/icon-192.png',
        badge: '/assets/icons/icon-192.png',
        vibrate: [100, 50, 100],
        actions: [
          {
            action: 'explore',
            title: 'View Details',
            icon: '/assets/icons/icon-192.png'
          },
          {
            action: 'close',
            title: 'Close',
            icon: '/assets/icons/icon-192.png'
          }
        ]
      };

      await this.registration.showNotification(title, { ...defaultOptions, ...options });
    }
  }

  async subscribeToPush() {
    if (!this.registration) return null;

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array('YOUR_VAPID_PUBLIC_KEY')
      });
      return subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  }

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Utility method to check if app is online
  isOnline() {
    return navigator.onLine;
  }

  // Listen for online/offline events
  onOnline(callback) {
    window.addEventListener('online', callback);
  }

  onOffline(callback) {
    window.addEventListener('offline', callback);
  }
}

// Create global instance
window.swHelper = new ServiceWorkerHelper();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.swHelper.init();
  });
} else {
  window.swHelper.init();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ServiceWorkerHelper;
}
