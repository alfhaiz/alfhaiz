// Service worker ini diperlukan agar browser mengenali website sebagai PWA yang bisa di-install.
self.addEventListener('fetch', (event) => {
  // Untuk saat ini, kita tidak perlu menambahkan logika caching yang rumit.
  // Cukup dengan adanya file ini, fitur "Add to Home Screen" sudah bisa muncul.
});