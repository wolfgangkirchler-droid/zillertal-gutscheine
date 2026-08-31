// Gutschein-Code-Felder automatisch in Großbuchstaben umwandeln
document.querySelectorAll('input[name="code"]').forEach((el) => {
  el.addEventListener('input', () => {
    const pos = el.selectionStart;
    el.value = el.value.toUpperCase();
    el.setSelectionRange(pos, pos);
  });
});
