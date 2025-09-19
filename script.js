document.addEventListener("DOMContentLoaded", () => {
    const morphingPlaceholder = document.getElementById("morphing-placeholder");

    const phrases = [
        "Animasi Morph Teks",
        "Kirim pesan...",
        "Tanya tentang apa saja",
        "Buatkan sebuah cerita",
        "Bagaimana saya bisa membantu?",
    ];

    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    const typingSpeed = 120;
    const deletingSpeed = 60;
    const delayBetweenPhrases = 1500;

    function animateText() {
        const currentPhrase = phrases[phraseIndex];
        let newText;

        if (isDeleting) {
            // Proses menghapus
            newText = currentPhrase.substring(0, charIndex - 1);
            charIndex--;
        } else {
            // Proses mengetik
            newText = currentPhrase.substring(0, charIndex + 1);
            charIndex++;
        }

        morphingPlaceholder.textContent = newText;

        // Logika untuk mengubah state
        if (!isDeleting && charIndex === currentPhrase.length) {
            // Selesai mengetik, tunggu, lalu mulai hapus
            isDeleting = true;
            setTimeout(animateText, delayBetweenPhrases);
        } else if (isDeleting && charIndex === 0) {
            // Selesai menghapus, ganti ke frasa berikutnya
            isDeleting = false;
            phraseIndex = (phraseIndex + 1) % phrases.length;
            setTimeout(animateText, typingSpeed);
        } else {
            // Lanjutkan mengetik atau menghapus
            setTimeout(animateText, isDeleting ? deletingSpeed : typingSpeed);
        }
    }

    // Mulai animasi setelah jeda awal
    setTimeout(animateText, 1000);
});
